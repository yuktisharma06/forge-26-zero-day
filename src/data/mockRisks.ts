import type { Bilingual, CropId, RiskSource, WeatherRisk } from '../types/farm';

const ICAR_SUGARCANE: RiskSource = {
  name: 'ICAR-IIFSR Sugarcane Crop Management',
  url: 'https://dss.iifsr.org.in/sugarcane_management.php',
};

const IMD_SUGARCANE_UP: RiskSource = {
  name: 'IMD MAUSAM: extreme weather and sugarcane in UP',
  url: 'https://mausamjournal.imd.gov.in/index.php/MAUSAM/article/view/1187',
};

const IMD_WHEAT: RiskSource = {
  name: 'IMD MAUSAM: climatic impacts on wheat',
  url: 'https://mausamjournal.imd.gov.in/index.php/MAUSAM/article/view/1179',
};

const IMD_KALP: RiskSource = {
  name: 'IMD KALP operational framework',
  url: 'https://mausam.imd.gov.in/imd_latest/contents/agromet/kalp/kalp.pdf',
};

const NEXT_SEVEN_DAYS: Bilingual = { hi: 'अगले 7 दिन', en: 'Next 7 days' };

interface StageAdvisoryFixture {
  risks: WeatherRisk[];
  insufficientData: Bilingual | null;
  aiSummary: Bilingual | null;
}

const SUGARCANE_STAGES: Record<string, StageAdvisoryFixture> = {
  germination: {
    risks: [
      {
        id: 'sc-germination-waterlogging',
        title: { hi: 'जलभराव का खतरा (भारी बारिश)', en: 'Waterlogging watch (heavy rain)' },
        severity: null,
        forecastPeriod: NEXT_SEVEN_DAYS,
        weatherCondition: {
          hi: 'कुछ दिनों में बारिश की अधिक संभावना',
          en: 'Higher chance of rain on some days',
        },
        whyItMatters: {
          hi: 'नए उगे पौधों की जड़ें ज़्यादा देर पानी में रहें तो उन्हें नुकसान हो सकता है। इसलिए खेत से पानी निकलने की व्यवस्था ज़रूरी है।',
          en: 'Young shoots can be damaged if roots stay in standing water, so keeping drainage clear matters.',
        },
        precautions: [
          { hi: 'खेत की नालियां और मेड़ें साफ रखें', en: 'Keep field drains and channels clear' },
          { hi: 'बारिश के बाद खेत में जमा पानी निकालें', en: 'After rain, drain any standing water' },
        ],
        sources: [ICAR_SUGARCANE],
      },
    ],
    insufficientData: null,
    aiSummary: {
      hi: 'अंकुरण के समय ज़्यादा पानी जमा होने से नए पौधों को नुकसान हो सकता है। आने वाली बारिश को देखते हुए खेत की नालियां साफ रखें।',
      en: 'Standing water can harm young shoots during germination. With rain expected, keep the field drains clear.',
    },
  },
  tillering: {
    risks: [
      {
        id: 'sc-tillering-heat',
        title: { hi: 'गर्मी का तनाव (अधिक तापमान)', en: 'Heat stress watch (high temperature)' },
        severity: null,
        forecastPeriod: NEXT_SEVEN_DAYS,
        weatherCondition: {
          hi: 'अगले कुछ दिनों में तापमान ऊंचा रहने की संभावना',
          en: 'Higher temperatures expected on some days',
        },
        whyItMatters: {
          hi: 'बहुत तेज़ गर्मी में कल्ले बनने की प्रक्रिया पर असर पड़ सकता है। मिट्टी में नमी बनी रहना जरूरी है।',
          en: 'Very high temperatures can affect shoot formation, so soil moisture needs to stay adequate.',
        },
        precautions: [
          { hi: 'मिट्टी में नमी बनाए रखें', en: 'Keep soil moisture adequate' },
          { hi: 'मिट्टी सूखी लगे तो हल्की सिंचाई करें', en: 'Irrigate lightly if the soil looks dry' },
        ],
        sources: [ICAR_SUGARCANE, IMD_SUGARCANE_UP],
      },
    ],
    insufficientData: null,
    aiSummary: {
      hi: 'कल्ले निकलने के समय गर्मी से पौधों पर दबाव बढ़ सकता है। खेत में नमी बनाए रखना सबसे सरल उपाय है।',
      en: 'During tillering, heat can add stress to the plants. Keeping the field moist is the simplest step.',
    },
  },
  grand_growth: {
    risks: [
      {
        id: 'sc-grand-growth-water-stress',
        title: { hi: 'पानी की कमी (सूखा)', en: 'Water stress watch (dry spell)' },
        severity: null,
        forecastPeriod: NEXT_SEVEN_DAYS,
        weatherCondition: {
          hi: 'अगले दिनों में बारिश की संभावना कम',
          en: 'Low chance of rain in the coming days',
        },
        whyItMatters: {
          hi: 'तेज़ बढ़वार के समय पर्याप्त पानी ज़रूरी है। पानी की कमी से गन्ने की लंबाई और वज़न पर असर पड़ सकता है।',
          en: 'Adequate water is important during grand growth. A shortage can reduce cane length and weight.',
        },
        precautions: [
          { hi: 'मिट्टी की नमी जांचें', en: 'Check soil moisture' },
          { hi: 'जरूरत के अनुसार सिंचाई की योजना बनाएं', en: 'Plan irrigation as needed' },
        ],
        sources: [ICAR_SUGARCANE, IMD_SUGARCANE_UP],
      },
    ],
    insufficientData: null,
    aiSummary: {
      hi: 'गन्ना तेज़ी से बढ़ रहा हो तो उसे नियमित पानी चाहिए। सूखे दिनों में मिट्टी की नमी पर नज़र रखें।',
      en: 'A growing cane crop needs regular water. Watch soil moisture during dry days.',
    },
  },
  maturity: {
    risks: [
      {
        id: 'sc-maturity-cold-stress',
        title: { hi: 'ठंड का तनाव (कम तापमान)', en: 'Cold stress watch (low temperature)' },
        severity: null,
        forecastPeriod: NEXT_SEVEN_DAYS,
        weatherCondition: {
          hi: 'अगले कुछ दिनों में रात का तापमान कम रहने की संभावना',
          en: 'Cooler nights expected on some days',
        },
        whyItMatters: {
          hi: 'ठंड में गन्ने की बढ़वार धीमी हो सकती है। पकने की अवस्था में यह असर महसूस हो सकता है।',
          en: 'Cold weather can slow cane growth and may be noticed during ripening.',
        },
        precautions: [
          { hi: 'खेत की स्थिति पर नज़र रखें', en: 'Monitor the field condition' },
          { hi: 'स्थानीय कृषि सलाह की जानकारी लें', en: 'Check local agricultural advice' },
        ],
        sources: [IMD_SUGARCANE_UP],
      },
    ],
    insufficientData: null,
    aiSummary: {
      hi: 'पकने के समय ठंडी रातें गन्ने की बढ़वार पर असर डाल सकती हैं। यह चेतावनी केवल मौसम के पूर्वानुमान पर आधारित है।',
      en: 'Cool nights during ripening can affect cane growth. This warning is based only on the weather forecast.',
    },
  },
};

const WHEAT_STAGES: Record<string, StageAdvisoryFixture> = {
  early_growth: {
    risks: [],
    insufficientData: {
      hi: 'इस चरण के लिए सत्यापित मौसम सीमा अभी उपलब्ध नहीं है, इसलिए भरोसेमंद जोखिम आकलन नहीं किया जा सकता।',
      en: 'Verified weather thresholds for this stage are not yet available, so a reliable risk assessment cannot be made.',
    },
    aiSummary: {
      hi: 'शुरुआती बढ़वार में खेत की नमी और जल निकासी पर ध्यान दें। मौसम के नए अपडेट देखते रहें।',
      en: 'In early growth, watch field moisture and drainage. Keep checking updated forecasts.',
    },
  },
  crown_root: {
    risks: [
      {
        id: 'wh-crown-root-cold',
        title: { hi: 'ठंड का तनाव (कम तापमान)', en: 'Low-temperature stress watch' },
        severity: null,
        forecastPeriod: NEXT_SEVEN_DAYS,
        weatherCondition: {
          hi: 'अगले दिनों में रात का तापमान कम रहने की संभावना',
          en: 'Cooler nights expected in the coming days',
        },
        whyItMatters: {
          hi: 'जड़ विकास के समय ठंड का असर पौधों की बढ़वार पर पड़ सकता है।',
          en: 'Cold during crown root development can slow the growth of the plants.',
        },
        precautions: [
          { hi: 'खेत में पर्याप्त नमी बनाए रखें', en: 'Keep adequate moisture in the field' },
        ],
        sources: [IMD_WHEAT],
      },
    ],
    insufficientData: null,
    aiSummary: {
      hi: 'जड़ों के विकास के समय ठंडी रातें असर डाल सकती हैं। मिट्टी में नमी बनाए रखें।',
      en: 'Cool nights can affect root development. Maintain soil moisture.',
    },
  },
  vegetative: {
    risks: [
      {
        id: 'wh-vegetative-excess-rain',
        title: { hi: 'अधिक बारिश से जलभराव का खतरा', en: 'Excess rain and waterlogging watch' },
        severity: null,
        forecastPeriod: NEXT_SEVEN_DAYS,
        weatherCondition: {
          hi: 'कुछ दिनों में भारी बारिश की संभावना',
          en: 'Heavy rain possible on some days',
        },
        whyItMatters: {
          hi: 'खेत में ज़्यादा पानी रुकने से जड़ों को हवा कम मिलती है। बारिश से पहले ही निकासी देखें।',
          en: 'Standing water reduces air around the roots. Check drainage before the rain.',
        },
        precautions: [
          { hi: 'खेत से अतिरिक्त पानी निकालने की व्यवस्था रखें', en: 'Keep a way to drain extra water from the field' },
        ],
        sources: [IMD_WHEAT],
      },
    ],
    insufficientData: null,
    aiSummary: {
      hi: 'कल्ले निकलने के समय अधिक बारिश से खेत में पानी रुक सकता है। निकासी की व्यवस्था देखें।',
      en: 'During tillering, heavy rain can leave water standing in the field. Check drainage.',
    },
  },
  reproductive: {
    risks: [
      {
        id: 'wh-reproductive-heat',
        title: { hi: 'फूल आने के समय गर्मी का तनाव', en: 'Heat stress during flowering watch' },
        severity: null,
        forecastPeriod: NEXT_SEVEN_DAYS,
        weatherCondition: {
          hi: 'अगले कुछ दिनों में तापमान ऊंचा रहने की संभावना',
          en: 'Higher temperatures expected on some days',
        },
        whyItMatters: {
          hi: 'फूल आने के समय तेज़ गर्मी से दाने बनने पर असर पड़ सकता है।',
          en: 'Strong heat during flowering can affect grain formation.',
        },
        precautions: [
          { hi: 'पानी की उपलब्धता सुनिश्चित करें', en: 'Make sure water is available for irrigation' },
          { hi: 'स्थानीय कृषि सलाह की जानकारी लें', en: 'Check local agricultural advice' },
        ],
        sources: [IMD_WHEAT, IMD_KALP],
      },
    ],
    insufficientData: null,
    aiSummary: {
      hi: 'बाली और फूल आने के समय गर्मी फसल पर दबाव डाल सकती है। सिंचाई की तैयारी रखें।',
      en: 'Heat during booting and flowering can stress the crop. Be ready to irrigate.',
    },
  },
  grain_development: {
    risks: [
      {
        id: 'wh-grain-heat',
        title: { hi: 'दाना भरते समय अधिक तापमान', en: 'High temperature during grain filling' },
        severity: null,
        forecastPeriod: NEXT_SEVEN_DAYS,
        weatherCondition: {
          hi: 'अधिकतम तापमान 30 डिग्री सेल्सियस से ऊपर जाने की संभावना',
          en: 'Maximum temperature may go above 30 degrees Celsius',
        },
        whyItMatters: {
          hi: 'दाना भरने के समय अधिक तापमान से दाने हल्के रह सकते हैं। यह सीमा अभी सहारनपुर के लिए सत्यापित नहीं है।',
          en: 'High temperature during grain filling can lead to lighter grains. This limit is not yet validated for Saharanpur.',
        },
        precautions: [
          { hi: 'मिट्टी में नमी बनाए रखें', en: 'Keep soil moisture adequate' },
          { hi: 'मौसम के नए अपडेट पर नज़र रखें', en: 'Watch for updated weather forecasts' },
        ],
        sources: [IMD_KALP],
      },
    ],
    insufficientData: null,
    aiSummary: {
      hi: 'दाना भरते समय गर्मी का असर हो सकता है। खेत में नमी बनाए रखें और मौसम पर नज़र रखें।',
      en: 'Heat may affect the crop while grain fills. Keep the field moist and watch the weather.',
    },
  },
};

export const MOCK_STAGE_ADVISORIES: Record<CropId, Record<string, StageAdvisoryFixture>> = {
  sugarcane: SUGARCANE_STAGES,
  wheat: WHEAT_STAGES,
};
