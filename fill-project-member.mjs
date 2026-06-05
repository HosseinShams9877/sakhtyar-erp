import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fillProjectMember() {
  const userProjects = await prisma.userProject.findMany();
  
  for (const up of userProjects) {
    const user = await prisma.user.findUnique({ where: { id: up.userId } });
    if (!user?.roleId) continue;
    
    const existing = await prisma.projectMember.findUnique({
      where: { userId_projectId: { userId: up.userId, projectId: up.projectId } }
    });
    
    if (!existing) {
      await prisma.projectMember.create({
        data: {
          userId: up.userId,
          projectId: up.projectId,
          roleId: user.roleId,
        },
      });
      console.log(`✅ Added: ${up.userId} -> ${up.projectId}`);
    }
  }
  
  console.log('Done!');
}

fillProjectMember();