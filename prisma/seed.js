// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    try {
        // Create admin user
        const adminPassword = await bcrypt.hash('admin123', 10);
        
        // Check if admin already exists
        const existingAdmin = await prisma.admin.findUnique({
            where: { email: 'admin@ordermitra.com' }
        });

        let admin;
        if (existingAdmin) {
            console.log('ℹ️  Admin user already exists, skipping...');
            admin = existingAdmin;
        } else {
            admin = await prisma.admin.create({
                data: {
                    name: 'Admin User',
                    email: 'admin@ordermitra.com',
                    password: adminPassword,
                    role: 'super_admin',
                },
            });
            console.log('✅ Admin user created:', admin.email);
        }

        console.log('🎉 Seeding completed!');
    } catch (error) {
        console.error('❌ Seeding error:', error);
        throw error;
    }
}

main()
    .catch((e) => {
        console.error('❌ Seeding error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

