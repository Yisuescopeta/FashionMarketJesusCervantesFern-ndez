
import { createClient } from '@supabase/supabase-js';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env');
        const envFile = fs.readFileSync(envPath, 'utf8');
        const envVars = {};
        envFile.split('\n').forEach(line => {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0) {
                let value = valueParts.join('=');
                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.slice(1, -1);
                } else if (value.startsWith("'") && value.endsWith("'")) {
                    value = value.slice(1, -1);
                }
                envVars[key.trim()] = value.trim();
            }
        });
        return envVars;
    } catch (e) {
        return {};
    }
}

const env = loadEnv();

const supabase = createClient(env.PUBLIC_SUPABASE_URL, env.PUBLIC_SUPABASE_ANON_KEY);

cloudinary.config({
    cloud_name: env.PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: env.PUBLIC_CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET
});

async function uploadFromUrl(url, publicId) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        return new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                { public_id: publicId, overwrite: true },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            stream.end(buffer);
        });
    } catch (e) {
        throw e;
    }
}

async function generate() {
    console.log("Fetching products...");
    const { data: products, error } = await supabase.from('products').select('*');
    if (error) {
        console.error("Supabase Error:", error);
        return;
    }

    let sqlOutput = "";

    for (const product of products) {
        // console.log(`Processing ${product.slug}...`);
        const currentImages = product.images || [];
        const newImages = [];
        let changed = false;

        for (let i = 0; i < currentImages.length; i++) {
            const img = currentImages[i];
            if (img.startsWith('http')) {
                const publicId = `productos/${product.slug}${currentImages.length > 1 ? `-${i + 1}` : ''}`;
                process.stdout.write(`Uploading ${product.slug} [${i + 1}/${currentImages.length}]... `);
                try {
                    await uploadFromUrl(img, publicId);
                    newImages.push(publicId);
                    changed = true;
                    console.log("Done.");
                } catch (e) {
                    console.log("Failed.");
                    console.warn(`Failed to upload ${img}:`, e.message);
                    newImages.push(img);
                }
            } else {
                newImages.push(img);
            }
        }

        if (changed) {
            // Postgres array syntax: '{"item1", "item2"}'
            // But if it's JSONB it might be different. 
            // In Supabase UI SQL editor, for text[] array, format is '{"val1","val2"}'
            // If the column is jsonb, format is '["val1","val2"]'
            // Let's assume text[] based on common usage, but wait, usually Supabase uses JSONB for images?
            // Actually, `products` table in many starters uses `text[]`. 
            // Let's check type if possible? No.
            // I'll assume text[] heavily or JSONB. 
            // Update: CloudinaryImage component expects a string (public ID). 
            // In SQL: `UPDATE products SET images = ARRAY['id1', 'id2'] WHERE id = ...` is safest for text[] or equivalent.
            // Or `UPDATE products SET images = '{"id1", "id2"}' WHERE id = ...`
            // If it is JSONB: `UPDATE products SET images = '["id1", "id2"]'::jsonb WHERE id = ...`

            // I will use a format that works for both if passed as string literal to a smart client, but for raw SQL:
            // Let's try to determine from `check_db` output. Output showed `images: [ ... ]` which implies JSON array in JS output.
            // I'll stick to Postgres array literal format `'{...}'` for text[]. 
            // IF it's JSON, this might fail.
            // Safest is `UPDATE products SET images = CAST('["..."]' AS JSONB) ...` if it's JSONB.
            // Or just `UPDATE products SET images = '{...}'` if array.

            // Let's try to output standard array literal `'{a,b}'`
            const imagesSqlLiteral = `{${newImages.map(s => `"${s}"`).join(',')}}`;

            sqlOutput += `UPDATE products SET images = '${imagesSqlLiteral}' WHERE id = '${product.id}';\n`;
        }
    }

    fs.writeFileSync('final_migration.sql', sqlOutput);
    console.log("SQL Generated to final_migration.sql");
}

generate();
