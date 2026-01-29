import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findBlackTshirt() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .ilike('name', '%camiseta%')
    .ilike('name', '%negra%');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Camisetas negras encontradas:', JSON.stringify(data, null, 2));
}

findBlackTshirt();
