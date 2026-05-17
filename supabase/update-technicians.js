/**
 * Script para actualizar técnicos via Netlify Functions
 * Ejecutar con: node supabase/update-technicians.js
 */

const BASE_URL = 'https://primelinecoffee-service.netlify.app';

// Técnicos a agregar
const newTechnicians = [
  {
    full_name: 'Luis Diaz',
    email: 'luis.diaz@primelinedist.com',
    password: 'TempPass123', // Cambiar después del primer login
    phone: null
  },
  {
    full_name: 'Ronny Benjamin',
    email: 'ronny.benjamin@primelinedist.com',
    password: 'TempPass123',
    phone: null
  },
  {
    full_name: 'Elias Monnot',
    email: 'elias.monnot@primelinedist.com',
    password: 'TempPass123',
    phone: null
  }
];

// Email del técnico a remover (desactivar)
const technicianToRemove = 'andy.hernandez@primelinedist.com';

async function createTechnician(data) {
  try {
    const response = await fetch(`${BASE_URL}/.netlify/functions/create-technician`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Error creando técnico');
    }
    
    console.log(`✅ Técnico creado: ${data.full_name} (${data.email})`);
    return result;
  } catch (error) {
    console.error(`❌ Error creando ${data.full_name}:`, error.message);
    return null;
  }
}

async function deactivateTechnician(email) {
  console.log(`⚠️  Para desactivar ${email}, hazlo desde el Admin Panel:`);
  console.log(`   1. Ve a ${BASE_URL}/admin/technicians`);
  console.log(`   2. Busca a Andy Hernandez`);
  console.log(`   3. Click en el toggle de estado (UserX icon)`);
  console.log('');
}

async function main() {
  console.log('🚀 Actualizando técnicos...\n');
  
  // 1. Desactivar Andy
  await deactivateTechnician(technicianToRemove);
  
  // 2. Crear nuevos técnicos
  console.log('📝 Creando nuevos técnicos:\n');
  for (const tech of newTechnicians) {
    await createTechnician(tech);
    // Esperar 1 segundo entre cada creación
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n✅ Proceso completado!');
  console.log('\n📋 Resumen:');
  console.log(`   - Desactivar manualmente: Andy Hernandez`);
  console.log(`   - Técnicos agregados: ${newTechnicians.length}`);
  console.log('\n🔐 Contraseña temporal para todos: TempPass123');
  console.log('   ⚠️  Pídeles que cambien su contraseña después del primer login\n');
}

main();
