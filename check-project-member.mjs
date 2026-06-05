import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkProjectMember() {
  console.log('🔍 Checking ProjectMember table...');
  
  const projectMembers = await prisma.projectMember.findMany({
    include: {
      user: { select: { name: true, nationalCode: true } },
      project: { select: { name: true } },
      role: { select: { name: true, label: true } }
    }
  });
  
  console.log(`📋 Total records in ProjectMember: ${projectMembers.length}`);
  
  if (projectMembers.length === 0) {
    console.log('❌ ProjectMember table is EMPTY!');
  } else {
    console.log('✅ Records found:');
    projectMembers.forEach(pm => {
      console.log(`   - User: ${pm.user.name} | Project: ${pm.project.name} | Role: ${pm.role.label}`);
    });
  }
  
  const userProjects = await prisma.userProject.findMany({
    include: {
      user: { select: { name: true } },
      project: { select: { name: true } }
    }
  });
  
  console.log(`\n📋 Total records in UserProject: ${userProjects.length}`);
  userProjects.forEach(up => {
    console.log(`   - User: ${up.user.name} | Project: ${up.project.name} | Role: ${up.role}`);
  });
}

checkProjectMember()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });