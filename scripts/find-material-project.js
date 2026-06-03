// scripts/find-material-project.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const material = await prisma.material.findFirst({
    where: { name: 'سیمان تیپ ۲' },
    select: { id: true, name: true, projectId: true }
  });
  
  console.log(`📦 ${material.name}`);
  console.log(`   projectId: ${material.projectId}`);
}

main().finally(() => prisma.$disconnect());