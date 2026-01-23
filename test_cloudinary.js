
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

cloudinary.config({
    cloud_name: env.PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: env.PUBLIC_CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET
});

async function test() {
    try {
        console.log("Testing fetch & upload...");
        // Use a known working image
        const url = "https://images.unsplash.com/photo-1598033129183-c4f50c7176c8?q=80&w=800";

        console.log("Fetching:", url);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        console.log("Got buffer, uploading...");

        await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { public_id: 'test_upload_buffer' },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            uploadStream.end(buffer);
        })
            .then(result => console.log("Success:", result.public_id))
            .catch(err => console.error("Upload stream failed:", err));

    } catch (error) {
        console.error("Test failed:", error);
    }
}

test();
