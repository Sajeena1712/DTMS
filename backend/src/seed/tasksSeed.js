import prisma from "../lib/prisma.js";
import connectDatabase from "../config/db.js";

async function seedTasks() {
  try {
    await connectDatabase();
    console.log("Connected to MongoDB");

    await prisma.task.deleteMany({});
    console.log("Cleared existing tasks");

    const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    const user = await prisma.user.findFirst({ where: { role: { in: ["USER", "TEAM_LEADER"] } } });

    if (!admin) {
      console.error("No admin user found. Create admin first: node src/seed/adminSeed.js");
      return;
    }

    if (!user) {
      console.warn("No regular user found. Creating demo user tasks for admin only.");
    }

    const sampleTasks = [
      {
        title: "Review Q3 candidate profiles",
        description: "Go through 15 new applications for Senior Developer roles. Prioritize frontend skills.",
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: "PENDING",
        priority: "HIGH",
        userId: user?.id || admin.id,
        teamId: user?.teamId || null,
      },
      {
        title: "Update hiring workflow documentation",
        description: "Document new task approval process with screenshots. Share with team.",
        deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        status: "IN_PROGRESS",
        priority: "MEDIUM",
        userId: user?.id || admin.id,
        teamId: user?.teamId || null,
      },
      {
        title: "Conduct React Developer interview",
        description: "30-min interview with Sajeena. Focus on hooks, performance, Tailwind.",
        deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        status: "PENDING_REVIEW",
        priority: "HIGH",
        userId: user?.id || admin.id,
        teamId: user?.teamId || null,
        submission: {
          text: "Uploaded React coding test and resume.",
          fileName: "react-test.jsx",
          submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        },
      },
      {
        title: "Approve team calendar integration",
        description: "Review Google Calendar sync feature. Test scheduling conflicts.",
        deadline: null,
        status: "COMPLETED",
        priority: "LOW",
        userId: user?.id || admin.id,
        teamId: user?.teamId || null,
        review: {
          decision: "Approved",
          feedback: "Great work! Ready for prod.",
          reviewedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
      },
      {
        title: "Fix task submission upload bug",
        description: "File uploads fail for >5MB. Add validation and progress bar.",
        deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        status: "REJECTED",
        priority: "HIGH",
        userId: admin.id,
        teamId: admin.teamId || null,
        submission: {
          text: "Added resize logic.",
          fileUrl: "https://example.com/bugfix.zip",
          submittedAt: new Date(),
        },
        review: {
          decision: "Rejected",
          feedback: "Need chunked upload for large files.",
          reviewedAt: new Date(),
        },
      },
      {
        title: "Onboard new team member",
        description: "Setup accounts, assign first task, intro call.",
        deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        status: "PENDING",
        priority: "MEDIUM",
        userId: admin.id,
        teamId: admin.teamId || null,
      },
    ];

    const createdTasks = await prisma.task.createMany({
      data: sampleTasks,
    });

    console.log(`Seeded ${createdTasks.count} tasks successfully!`);
    console.log("Sample tasks created. View at /tasks (admin) or user dashboard.");
  } catch (error) {
    console.error("Seed failed:", error);
  }
}

seedTasks();
