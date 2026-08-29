import { PlanFeature } from 'src/modules/shared/plan/entities/plan-feature.entity';
import { Plan } from 'src/modules/shared/plan/entities/plan.entity';

import { DataSource } from 'typeorm';

export async function StorePlansSeed(dataSource: DataSource) {
  const planRepository = dataSource.getRepository(Plan);
  const planFeatureRepository = dataSource.getRepository(PlanFeature);

  const plans = [
    {
      name: 'Grátis',
      price: 0,
      description: 'Loja online grátis',
      is_active: true,
      position: 1,

      // Limites reais, usados pelo backend para bloquear a loja
      limit_products: 10,
      limit_images_per_product: 1,
      limit_orders_per_month: 30,
      allows_custom_domain: false,
      allows_advanced_statistics: false,
      allows_chatbot: false,
      has_priority_support: false,

      // Apenas texto para exibição na página de preços
      features: [
        { text: 'Até 10 produtos', is_included: true, position: 1 },
        { text: 'Loja online personalizada', is_included: true, position: 2 },
        { text: 'Pedidos via WhatsApp', is_included: true, position: 3 },
        {
          text: 'Código de rastreio de pedidos',
          is_included: true,
          position: 4,
        },
        { text: 'Estatísticas básicas', is_included: false, position: 5 },
        { text: 'Domínio próprio', is_included: false, position: 6 },
        { text: 'Suporte prioritário', is_included: false, position: 7 },
      ],
    },
    {
      name: 'Pro',
      price: 5000,
      description: 'Para negócios em crescimento',
      is_active: true,
      position: 2,

      limit_products: 100,
      limit_images_per_product: 4,
      limit_orders_per_month: null,
      allows_custom_domain: false,
      allows_advanced_statistics: true,
      allows_chatbot: true,
      has_priority_support: false,

      features: [
        { text: 'Até 100 produtos', is_included: true, position: 1 },
        { text: 'Loja online personalizada', is_included: true, position: 2 },
        { text: 'Pedidos via WhatsApp', is_included: true, position: 3 },
        {
          text: 'Código de rastreio de pedidos',
          is_included: true,
          position: 4,
        },
        { text: 'Estatísticas avançadas', is_included: true, position: 5 },
        { text: 'Chatbot da loja', is_included: true, position: 6 },
        { text: 'Domínio próprio', is_included: false, position: 7 },
        { text: 'Suporte prioritário', is_included: false, position: 8 },
      ],
    },
    {
      name: 'Premium',
      price: 12000,
      description: 'Sem limites para o seu negócio',
      is_active: true,
      position: 3,

      limit_products: null,
      limit_images_per_product: null,
      limit_orders_per_month: null,
      allows_custom_domain: true,
      allows_advanced_statistics: true,
      allows_chatbot: true,
      has_priority_support: true,

      features: [
        { text: 'Produtos ilimitados', is_included: true, position: 1 },
        { text: 'Loja online personalizada', is_included: true, position: 2 },
        { text: 'Pedidos via WhatsApp', is_included: true, position: 3 },
        {
          text: 'Código de rastreio de pedidos',
          is_included: true,
          position: 4,
        },
        { text: 'Estatísticas avançadas', is_included: true, position: 5 },
        { text: 'Chatbot da loja', is_included: true, position: 6 },
        { text: 'Domínio próprio', is_included: true, position: 7 },
        { text: 'Suporte prioritário', is_included: true, position: 8 },
      ],
    },
  ];

  for (const { features, ...planData } of plans) {
    await planRepository.upsert(planData, {
      conflictPaths: ['name'],
      skipUpdateIfNoValuesChanged: true,
    });

    const savedPlan = await planRepository.findOneOrFail({
      where: { name: planData.name },
    });

    const featuresWithPlanId = features.map((feature) => ({
      ...feature,
      plan: { id: savedPlan.id },
    }));

    await planFeatureRepository.upsert(featuresWithPlanId, {
      conflictPaths: ['plan', 'text'],
      skipUpdateIfNoValuesChanged: true,
    });
  }
}
