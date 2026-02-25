// lib/i18n.ts

export type Locale = "pt" | "en";

export const dictionary = {
    pt: {
        title: "Portal de Dados do Maio",
        subtitle:
            "Indicadores do desenvolvimento e turismo da ilha do Maio · maioazul.com",

        localGovernment: "Governo Local",
        localPopulation: "população",
        localGovernmentDesc:
            "Transferências do Estado para o município do Maio.",

        tourismOverview: "Turismo · Visão Geral (Q3)",

        tourismPressure: "Índice de Pressão Turística",
        tourismPressureDesc:
            "Relação entre o número de dormidas turísticas e a população residente.",

        seasonality: "Contraste Sazonal (Q3 / Q1)",

        dependency: "Turistas por País de Origem",

        noData: "Sem dados",

        /* =========================
           Maio · Indicadores Estruturais
        ========================= */

        dataSources: {
            title: "Fonte dos dados",
            description:
                "Os dados apresentados provêm de fontes públicas oficiais.",
            sources: [
                "INE Cabo Verde (ine.cv)",
                "Portal da Transparência (portaltransparencia.gov.cv)",
            ],
            note:
                "Os indicadores podem ser atualizados à medida que novas publicações oficiais se tornam disponíveis.",
        },

        maioCoreMetrics: {
            title: "Indicadores Estruturais",
            subtitle: "Perfil demográfico, social e infraestrutural da ilha.",

            metrics: {
                total_population: {
                    label: "População residente",
                    description: "Número total de residentes na ilha",
                    format: "number",
                    order: 1,
                },
                population_share_national: {
                    label: "Percentagem nacional",
                    description: "Percentagem da população nacional",
                    format: "percent",
                    order: 2,
                },
                total_households: {
                    label: "Agregados familiares",
                    description: "Número total de agregados",
                    format: "number",
                    order: 3,
                },
                average_household_size: {
                    label: "Dimensão média do agregado",
                    description: "Número médio de pessoas por agregado",
                    format: "number",
                    order: 4,
                },
                employment_rate: {
                    label: "Taxa de emprego",
                    description: "Percentagem da população ativa empregada",
                    format: "percent",
                    order: 5,
                },
                unemployment_rate: {
                    label: "Taxa de desemprego",
                    description: "Percentagem da população ativa desempregada",
                    format: "percent",
                    order: 6,
                },
                youth_unemployment_rate: {
                    label: "Desemprego jovem",
                    description: "Taxa de desemprego entre os 15 e os 24 anos",
                    format: "percent",
                    order: 7,
                },
                internet_access_home: {
                    label: "Acesso à internet em casa",
                    description: "Agregados com acesso à internet",
                    format: "percent",
                    order: 8,
                },
                water_network_access: {
                    label: "Acesso à rede de água",
                    description: "Agregados ligados à rede pública",
                    format: "percent",
                    order: 9,
                },
                electricity_access: {
                    label: "Acesso à eletricidade",
                    description: "Agregados com eletricidade",
                    format: "percent",
                    order: 10,
                },
            },
        },
    },

    en: {
        title: "Maio in Numbers",
        subtitle:
            "Structure and intensity of tourism by island · data available for 2025 only",

        localGovernment: "Local Government",
        localPopulation: "population",
        localGovernmentDesc:
            "Transfers from the central government to the municipality of Maio.",

        tourismOverview: "Tourism · Overview",

        tourismPressure: "Tourism Pressure Index",
        tourismPressureDesc:
            "Relationship between tourist nights and resident population.",

        seasonality: "Seasonality Contrast (Q3 / Q1)",

        dependency: "Country of Origin Dependency",

        noData: "No data",

        /* =========================
           Maio · Core Metrics
        ========================= */

        dataSources: {
            title: "Data sources",
            description:
                "The data presented comes from official public sources.",
            sources: [
                "INE Cabo Verde (ine.cv)",
                "Transparency Portal (portaltransparencia.gov.cv)",
            ],
            note:
                "Indicators may be updated as new official publications become available.",
        },

        maioCoreMetrics: {
            title: "Core Metrics",
            subtitle: "Demographic, social and infrastructure profile of the island.",

            metrics: {
                total_population: {
                    label: "Resident population",
                    description: "Total number of residents on the island",
                    format: "number",
                    order: 1,
                },
                population_share_national: {
                    label: "Share of national population",
                    description: "Percentage of the national population",
                    format: "percent",
                    order: 2,
                },
                total_households: {
                    label: "Households",
                    description: "Total number of households",
                    format: "number",
                    order: 3,
                },
                average_household_size: {
                    label: "Average household size",
                    description: "Average number of people per household",
                    format: "number",
                    order: 4,
                },
                employment_rate: {
                    label: "Employment rate",
                    description: "Percentage of the active population employed",
                    format: "percent",
                    order: 5,
                },
                unemployment_rate: {
                    label: "Unemployment rate",
                    description: "Percentage of the active population unemployed",
                    format: "percent",
                    order: 6,
                },
                youth_unemployment_rate: {
                    label: "Youth unemployment",
                    description: "Unemployment rate among ages 15–24",
                    format: "percent",
                    order: 7,
                },
                internet_access_home: {
                    label: "Home internet access",
                    description: "Households with internet access",
                    format: "percent",
                    order: 8,
                },
                water_network_access: {
                    label: "Water network access",
                    description: "Households connected to the public water network",
                    format: "percent",
                    order: 9,
                },
                electricity_access: {
                    label: "Electricity access",
                    description: "Households with electricity",
                    format: "percent",
                    order: 10,
                },
            },
        },
    },
} as const;
