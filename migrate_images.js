
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

async function migrate() {
    console.log("Starting migration...");
    const { data: products, error } = await supabase.from('products').select('*');
    if (error) {
        console.error("Supabase Error:", error);
        return;
    }

    let sqlOutput = "";

    for (const product of products) {
        console.log(`Processing ${product.slug}...`);
        const currentImages = product.images || [];
        const newImages = [];
        let changed = false;

        for (let i = 0; i < currentImages.length; i++) {
            const img = currentImages[i];
            if (img.startsWith('http')) {
                const publicId = `productos/${product.slug}${currentImages.length > 1 ? `-${i + 1}` : ''}`;
                console.log(`  Uploading ${img} -> ${publicId}`);
                try {
                    await uploadFromUrl(img, publicId);
                    newImages.push(publicId);
                    changed = true;
                    console.log("    Success");
                } catch (e) {
                    console.error("    Failed:", e.message);
                    newImages.push(img); // Keep original
                }
            } else {
                newImages.push(img);
            }
        }

        if (changed) {
            // Try Update Supabase
            const { error: upErr } = await supabase
                .from('products')
                .update({ images: newImages })
                .eq('id', product.id);

            if (upErr) {
                console.error(`  Supabase update failed for ${product.id}:`, upErr.message);
                // Add to SQL
                const imagesStr = JSON.stringify(newImages).replace(/'/g, "''"); // Escape quotes for SQL
                sqlOutput += `UPDATE products SET images = '${imagesStr}' WHERE id = '${product.id}';\n`;
            } else {
                console.log("  Supabase updated.");
            }
        }
    }

    if (sqlOutput) {
        fs.writeFileSync('migration.sql', sqlOutput);
        console.log("Migration finished with some DB errors. SQL saved to migration.sql");
    } else {
        console.log("Migration finished successfully.");
    }
}

migrate();
