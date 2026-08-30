import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Permission } from '../../../modules/shared/permission/entities/permission.entity';
import { Role } from '../../../modules/shared/role/entities/role.entity';
import { RolePermission } from '../../../modules/shared/role/entities/role-permission.entity';
import { AdminUser } from '../../../modules/shared/auth/entities/admin-user.entity';

const PERMISSIONS = [
  // Dashboard
  { slug: 'dashboard.read', description: 'Visualizar dashboard', module: 'dashboard' },
  
  // Store
  { slug: 'store.read', description: 'Visualizar lojas', module: 'store' },
  { slug: 'store.write', description: 'Gerir lojas', module: 'store' },
  
  // Product
  { slug: 'product.read', description: 'Visualizar produtos', module: 'product' },
  { slug: 'product.write', description: 'Gerir produtos', module: 'product' },
  
  // Category
  { slug: 'category.read', description: 'Visualizar categorias', module: 'category' },
  { slug: 'category.write', description: 'Gerir categorias', module: 'category' },
  
  // Order
  { slug: 'order.read', description: 'Visualizar pedidos', module: 'order' },
  { slug: 'order.write', description: 'Gerir pedidos', module: 'order' },
  
  // Dispute
  { slug: 'dispute.read', description: 'Visualizar disputas', module: 'dispute' },
  { slug: 'dispute.write', description: 'Gerir disputas', module: 'dispute' },
  
  // Finance
  { slug: 'finance.read', description: 'Visualizar finanças', module: 'finance' },
  { slug: 'finance.write', description: 'Gerir finanças', module: 'finance' },
  
  // Withdrawal
  { slug: 'withdrawal.read', description: 'Visualizar saques', module: 'withdrawal' },
  { slug: 'withdrawal.write', description: 'Gerir saques', module: 'withdrawal' },
  
  // Commission
  { slug: 'commission.read', description: 'Visualizar comissões', module: 'commission' },
  { slug: 'commission.write', description: 'Gerir comissões', module: 'commission' },
  
  // Customer
  { slug: 'customer.read', description: 'Visualizar clientes', module: 'customer' },
  { slug: 'customer.write', description: 'Gerir clientes', module: 'customer' },
  
  // Review
  { slug: 'review.read', description: 'Visualizar avaliações', module: 'review' },
  { slug: 'review.write', description: 'Gerir avaliações', module: 'review' },
  
  // Report
  { slug: 'report.read', description: 'Visualizar denúncias', module: 'report' },
  { slug: 'report.write', description: 'Gerir denúncias', module: 'report' },
  
  // Ticket
  { slug: 'ticket.read', description: 'Visualizar tickets', module: 'ticket' },
  { slug: 'ticket.write', description: 'Gerir tickets', module: 'ticket' },
  
  // Admin User
  { slug: 'admin-user.read', description: 'Visualizar administradores', module: 'admin-user' },
  { slug: 'admin-user.write', description: 'Gerir administradores', module: 'admin-user' },
  
  // Role
  { slug: 'role.read', description: 'Visualizar perfis de acesso', module: 'role' },
  { slug: 'role.write', description: 'Gerir perfis de acesso', module: 'role' },
  
  // Permission
  { slug: 'permission.read', description: 'Visualizar permissões', module: 'permission' },
  { slug: 'permission.write', description: 'Gerir permissões', module: 'permission' },
  
  // Config
  { slug: 'config.read', description: 'Visualizar configurações', module: 'config' },
  { slug: 'config.write', description: 'Gerir configurações', module: 'config' },
  
  // Audit
  { slug: 'audit.read', description: 'Visualizar logs de auditoria', module: 'audit' },
  
  // Plan
  { slug: 'plan.read', description: 'Visualizar planos', module: 'plan' },
  { slug: 'plan.write', description: 'Gerir planos', module: 'plan' },
  
  // System
  { slug: 'system.full-access', description: 'Acesso total ao sistema', module: 'system' },
];

const ROLES = [
  {
    name: 'SUPER ADMINISTRADOR',
    description: 'Acesso total a todas as funcionalidades do sistema',
    isRoot: true,
  },
  {
    name: 'ADMIN DE SUPORTE',
    description: 'Gestão de lojas, clientes, tickets e disputas',
    isRoot: false,
  },
  {
    name: 'ADMIN FINANCEIRO',
    description: 'Gestão de finanças, saques, comissões e planos',
    isRoot: false,
  },
];

export async function AdminSeed(dataSource: DataSource) {
  const permissionRepository = dataSource.getRepository(Permission);
  const roleRepository = dataSource.getRepository(Role);
  const rolePermissionRepository = dataSource.getRepository(RolePermission);
  const adminUserRepository = dataSource.getRepository(AdminUser);

  // Seed permissions
  for (const perm of PERMISSIONS) {
    await permissionRepository.upsert(perm, {
      conflictPaths: ['slug'],
      skipUpdateIfNoValuesChanged: true,
    });
  }
  console.log(`✅ ${PERMISSIONS.length} permissions seeded`);

  // Seed roles
  for (const roleData of ROLES) {
    const existing = await roleRepository.findOne({ where: { name: roleData.name } });
    if (!existing) {
      await roleRepository.save(roleRepository.create(roleData));
    }
  }
  console.log(`✅ ${ROLES.length} roles seeded`);

  // Get all permissions and roles for mapping
  const allPermissions = await permissionRepository.find();
  const superAdminRole = await roleRepository.findOne({ where: { name: 'SUPER ADMINISTRADOR' } });
  const supportRole = await roleRepository.findOne({ where: { name: 'ADMIN DE SUPORTE' } });
  const financeRole = await roleRepository.findOne({ where: { name: 'ADMIN FINANCEIRO' } });

  // Map permission slugs to IDs
  const permMap = new Map(allPermissions.map((p) => [p.slug, p.id]));

  // Super Admin gets system.full-access only
  if (superAdminRole) {
    const systemFullAccessId = permMap.get('system.full-access');
    if (systemFullAccessId) {
      const existing = await rolePermissionRepository.findOne({
        where: { roleId: superAdminRole.id, permissionId: systemFullAccessId },
      });
      if (!existing) {
        await rolePermissionRepository.save(
          rolePermissionRepository.create({
            roleId: superAdminRole.id,
            permissionId: systemFullAccessId,
          }),
        );
      }
    }
  }

  // Support Role permissions
  if (supportRole) {
    const supportPermSlugs = [
      'dashboard.read', 'store.read', 'store.write', 'product.read', 'product.write',
      'category.read', 'order.read', 'order.write', 'dispute.read', 'dispute.write',
      'customer.read', 'customer.write', 'review.read', 'review.write',
      'report.read', 'report.write', 'ticket.read', 'ticket.write',
      'role.read', 'permission.read', 'config.read', 'audit.read', 'plan.read',
    ];
    for (const slug of supportPermSlugs) {
      const permId = permMap.get(slug);
      if (permId) {
        const existing = await rolePermissionRepository.findOne({
          where: { roleId: supportRole.id, permissionId: permId },
        });
        if (!existing) {
          await rolePermissionRepository.save(
            rolePermissionRepository.create({
              roleId: supportRole.id,
              permissionId: permId,
            }),
          );
        }
      }
    }
  }

  // Finance Role permissions
  if (financeRole) {
    const financePermSlugs = [
      'dashboard.read', 'store.read', 'order.read', 'finance.read', 'finance.write',
      'withdrawal.read', 'withdrawal.write', 'commission.read', 'commission.write',
      'customer.read', 'role.read', 'permission.read', 'config.read', 'audit.read', 'plan.read',
    ];
    for (const slug of financePermSlugs) {
      const permId = permMap.get(slug);
      if (permId) {
        const existing = await rolePermissionRepository.findOne({
          where: { roleId: financeRole.id, permissionId: permId },
        });
        if (!existing) {
          await rolePermissionRepository.save(
            rolePermissionRepository.create({
              roleId: financeRole.id,
              permissionId: permId,
            }),
          );
        }
      }
    }
  }
  console.log('✅ Role permissions assigned');

  // Seed root admin user
  const existingAdmin = await adminUserRepository.findOne({
    where: { email: 'super@ngolashop.ao' },
  });
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('ngola123', 10);
    await adminUserRepository.save(
      adminUserRepository.create({
        name: 'Super Administrador',
        email: 'super@ngolashop.ao',
        password: hashedPassword,
        phone: '+244 923 456 789',
        isRoot: true,
        isActive: true,
        roleId: superAdminRole?.id,
      }),
    );
    console.log('✅ Root admin user created (super@ngolashop.ao / ngola123)');
  } else {
    console.log('ℹ️  Root admin user already exists');
  }
}
