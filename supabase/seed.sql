-- =============================================================================
-- KisanRakshak Seed: Crop-Specific Weather Risk Rules
-- =============================================================================
-- Sources:
--   [1] IMD KALP Operational Framework
--       https://mausam.imd.gov.in/imd_latest/contents/agromet/kalp/kalp.pdf
--   [2] IMD MAUSAM — Climatic Impacts on Wheat in Uttar Pradesh
--       https://mausamjournal.imd.gov.in/index.php/MAUSAM/article/view/1179
--   [3] IMD MAUSAM — Extreme Weather Impacts on Sugarcane in UP
--       https://mausamjournal.imd.gov.in/index.php/MAUSAM/article/view/1187
--   [4] ICAR-IIFSR Sugarcane Crop Management
--       https://dss.iifsr.org.in/sugarcane_management.php
--
-- IMPORTANT:
--   - validation_status = 'validated'          → automated severity classification allowed
--   - validation_status = 'research_observation' → qualitative "Potential Risk" warning only
--   - validation_status = 'pending_validation'   → qualitative warning, needs local KVK validation
--
-- Do NOT add rules without a verifiable agricultural source.
-- Do NOT invent numerical thresholds.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- WHEAT RULES
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO risk_rules (
  crop, growth_stage, weather_parameter, threshold_operator, threshold_value, threshold_unit,
  risk_name, risk_severity, validation_status,
  source, source_url,
  precautionary_action, precautionary_action_hi, notes
) VALUES

-- ── GRAIN DEVELOPMENT / MATURITY ──────────────────────────────────────────
-- IMD KALP explicitly identifies max temp > 30°C during grain filling as a validated operational threshold
(
  'wheat', 'grain_development_maturity', 'max_temp_c', 'gt', 30, '°C',
  'Terminal Heat Stress', 'Moderate', 'validated',
  'IMD KALP Operational Framework', 'https://mausam.imd.gov.in/imd_latest/contents/agromet/kalp/kalp.pdf',
  'Provide light irrigation to cool the crop canopy. Consider potassium-based foliar spray (KNO₃ 13:0:45 @ 2%) to improve heat tolerance. Harvest as soon as grain is physiologically mature to avoid further heat damage.',
  'फसल को ठंडा रखने के लिए हल्की सिंचाई करें। गर्मी सहनशीलता बढ़ाने के लिए पोटेशियम आधारित पर्णीय स्प्रे (KNO₃ 13:0:45 @ 2%) का उपयोग करें। दाने पक जाने के बाद शीघ्र कटाई करें।',
  'IMD KALP operational framework identifies max temperature > 30°C during grain filling as a heat-risk condition for wheat in north India. Source-attributed threshold used for automated classification.'
),

-- Severe heat during grain filling — referenced in ICAR/IMD wheat research for UP, marked as research_observation
(
  'wheat', 'grain_development_maturity', 'max_temp_c', 'gt', 35, '°C',
  'Severe Terminal Heat Stress', 'High', 'research_observation',
  'IMD MAUSAM — Climatic Impacts on Wheat in UP', 'https://mausamjournal.imd.gov.in/index.php/MAUSAM/article/view/1179',
  'Emergency irrigation if possible. Apply antitranspirants (kaolin foliar spray). Prioritise early harvest to salvage yield. Consult local KVK for region-specific guidance.',
  'तत्काल सिंचाई करें। काओलिन का पर्णीय छिड़काव करें। जल्दी कटाई करें। स्थानीय कृषि विज्ञान केंद्र से परामर्श लें।',
  'Temperature above 35°C during grain filling is referenced as causing significant yield loss in ICAR research. Treat as research observation; validate threshold with local KVK before operational use.'
),

-- ── REPRODUCTIVE STAGE (Booting / Flowering) ──────────────────────────────
(
  'wheat', 'reproductive', 'max_temp_c', 'gt', 28, '°C',
  'Flowering Heat Stress', 'Moderate', 'research_observation',
  'IMD MAUSAM — Climatic Impacts on Wheat in UP', 'https://mausamjournal.imd.gov.in/index.php/MAUSAM/article/view/1179',
  'Apply light irrigation in the evening to reduce canopy temperature. Avoid irrigation during peak afternoon heat. Monitor for grain shrivelling. Consult local KVK for regional guidance.',
  'शाम को हल्की सिंचाई करें। दोपहर की गर्मी में सिंचाई से बचें। दाने सिकुड़ने पर ध्यान दें। स्थानीय कृषि विज्ञान केंद्र से परामर्श लें।',
  'Temperatures > 28°C during flowering can reduce pollen viability in wheat. Research observation — local adaptation confirmation recommended before treating as operational threshold.'
),

(
  'wheat', 'reproductive', 'max_temp_c', 'gt', 32, '°C',
  'High Flowering Heat Stress', 'High', 'research_observation',
  'IMD MAUSAM — Climatic Impacts on Wheat in UP', 'https://mausamjournal.imd.gov.in/index.php/MAUSAM/article/view/1179',
  'Provide emergency irrigation. Apply potassium foliar spray (KCl @ 2%). Contact local KVK immediately. Significant yield loss likely — document for insurance purposes.',
  'तत्काल सिंचाई करें। पोटाश का पर्णीय छिड़काव करें (KCl @ 2%)। स्थानीय KVK से तुरंत संपर्क करें। गंभीर उपज हानि संभव है।',
  'Research observation requiring local validation. Temperature context and measurement methods vary across wheat studies.'
),

-- ── EARLY GROWTH (Emergence / Seedling) ───────────────────────────────────
(
  'wheat', 'early_growth', 'min_temp_c', 'lt', 2, '°C',
  'Frost Risk', 'Low', 'pending_validation',
  'General agricultural guidance for wheat in north India', NULL,
  'Light irrigation before anticipated frost to raise soil temperature. Monitor seedlings for frost damage. Consult KVK if frost persists for multiple days.',
  'पाले से पहले हल्की सिंचाई करें। अंकुरों में पाले की क्षति की निगरानी करें। लंबे समय तक पाला पड़ने पर KVK से संपर्क करें।',
  'Pending validation against ICAR/KVK Saharanpur-specific frost thresholds. Used as qualitative warning only until local data is confirmed.'
),

-- ── CRI (Crown Root Initiation) ───────────────────────────────────────────
(
  'wheat', 'cri', 'min_temp_c', 'lt', 5, '°C',
  'Cold Stress at CRI Stage', 'Low', 'pending_validation',
  'General agricultural guidance for wheat in north India', NULL,
  'Apply the first CRI irrigation to moderate soil temperature. Avoid nitrogen application during cold-stress periods.',
  'पहली CRI सिंचाई करें। ठंड के दौरान नाइट्रोजन उर्वरक देने से बचें।',
  'Threshold pending validation. Qualitative warning only — cold during CRI can impact crown root development.'
),

(
  'wheat', 'cri', 'precipitation_mm', 'gt', 30, 'mm/day',
  'Excess Rainfall / Waterlogging Risk at CRI', 'Moderate', 'pending_validation',
  'General agricultural guidance for wheat drainage management', NULL,
  'Ensure field drainage channels are clear. Avoid irrigating until soil moisture decreases. Excess water at CRI stage can impair crown root development and increase disease susceptibility.',
  'खेत की नाली साफ रखें। मिट्टी में नमी कम होने तक सिंचाई न करें। CRI अवस्था में अत्यधिक पानी से जड़ विकास प्रभावित हो सकता है।',
  'Rainfall > 30mm/day is a qualitative indicator of potential waterlogging. Actual waterlogging depends on soil type and drainage infrastructure. Pending validation.'
),

-- ── VEGETATIVE GROWTH (Tillering) ─────────────────────────────────────────
(
  'wheat', 'vegetative_growth', 'precipitation_mm', 'gt', 40, 'mm/day',
  'Excess Rainfall During Tillering', 'Low', 'pending_validation',
  'General agricultural guidance for wheat in Uttar Pradesh', NULL,
  'Clear field drainage channels to prevent waterlogging. Delay any planned irrigation. Monitor for yellowing leaves or disease signs.',
  'जल निकासी नालियों को साफ करें। नियोजित सिंचाई में देरी करें। पीली पत्तियों या बीमारी के संकेतों की निगरानी करें।',
  'Qualitative warning based on excess rainfall potential. Not a confirmed crop-damage prediction. Pending local validation.'
),

-- ─────────────────────────────────────────────────────────────────────────────
-- SUGARCANE RULES
-- ─────────────────────────────────────────────────────────────────────────────

-- ── GERMINATION STAGE ─────────────────────────────────────────────────────
(
  'sugarcane', 'germination', 'max_temp_c', 'gt', 38, '°C',
  'Heat Stress During Germination', 'Moderate', 'research_observation',
  'ICAR-IIFSR Sugarcane Crop Management; IMD MAUSAM — Sugarcane in UP',
  'https://dss.iifsr.org.in/sugarcane_management.php',
  'Provide light irrigation to cool the soil. Apply mulch over setts if practical. Avoid planting in peak summer without irrigation access. Monitor germination percentage.',
  'मिट्टी को ठंडा रखने के लिए हल्की सिंचाई करें। सम्भव हो तो बोरे पर मल्च लगाएं। सिंचाई के बिना गर्मी में रोपाई न करें। अंकुरण प्रतिशत देखें।',
  'Optimal germination temperature for sugarcane is 25–33°C. Temperatures above 38°C may reduce germination rate. Research observation; validate with local KVK before using as operational threshold.'
),

(
  'sugarcane', 'germination', 'min_temp_c', 'lt', 15, '°C',
  'Cold Stress During Germination', 'Low', 'research_observation',
  'ICAR-IIFSR Sugarcane Crop Management', 'https://dss.iifsr.org.in/sugarcane_management.php',
  'Delay sowing until minimum temperature is consistently above 15°C. If crop is already planted, apply light irrigation to stabilise soil temperature. Protect setts with a thin mulch layer.',
  'बुवाई तब तक टालें जब तक न्यूनतम तापमान लगातार 15°C से ऊपर न हो। यदि फसल लगाई जा चुकी है, हल्की सिंचाई करें। पतली मल्च से बीज की रक्षा करें।',
  'Sugarcane germination is impaired below 15°C. Research observation — actual threshold may vary with variety and local conditions.'
),

-- ── TILLERING STAGE ───────────────────────────────────────────────────────
(
  'sugarcane', 'tillering', 'precipitation_mm', 'gt', 50, 'mm/day',
  'Waterlogging Risk During Tillering', 'Moderate', 'pending_validation',
  'ICAR-IIFSR Sugarcane Crop Management (drainage guidance)',
  'https://dss.iifsr.org.in/sugarcane_management.php',
  'Clear drainage channels immediately. Ensure inter-row drainage is functional. Waterlogging during tillering can reduce tiller count and increase disease risk. Monitor for yellowing.',
  'तत्काल जल निकासी नालियां साफ करें। कतारों के बीच जल निकासी सुनिश्चित करें। कंसे निकलने के समय जलभराव से कंसे कम हो सकते हैं और बीमारी का खतरा बढ़ सकता है।',
  'ICAR-IIFSR highlights drainage importance during early growth stages. Rainfall > 50mm/day is a qualitative indicator; actual waterlogging depends on field drainage and soil type.'
),

(
  'sugarcane', 'tillering', 'max_temp_c', 'gt', 38, '°C',
  'Heat Stress During Tillering', 'Low', 'research_observation',
  'IMD MAUSAM — Extreme Weather Impacts on Sugarcane in UP',
  'https://mausamjournal.imd.gov.in/index.php/MAUSAM/article/view/1187',
  'Provide adequate irrigation. Avoid skipping irrigation intervals during high-temperature periods. Monitor for leaf scorching.',
  'पर्याप्त सिंचाई करें। उच्च तापमान के समय सिंचाई न चूकें। पत्ती झुलसने पर ध्यान दें।',
  'Research observation. Temperature context in sugarcane tillering research varies across UP studies. Validate with local KVK.'
),

-- ── GRAND GROWTH STAGE ────────────────────────────────────────────────────
(
  'sugarcane', 'grand_growth', 'max_temp_c', 'gt', 40, '°C',
  'Severe Heat Stress During Grand Growth', 'Moderate', 'research_observation',
  'IMD MAUSAM — Extreme Weather Impacts on Sugarcane in UP',
  'https://mausamjournal.imd.gov.in/index.php/MAUSAM/article/view/1187',
  'Increase irrigation frequency. Apply mulch between rows to conserve moisture. Avoid mechanical operations during peak heat. Grand growth has the highest water demand — do not skip irrigation.',
  'सिंचाई की आवृत्ति बढ़ाएं। नमी बनाए रखने के लिए कतारों के बीच मल्च लगाएं। चरम गर्मी के दौरान यांत्रिक कार्य से बचें। ग्रैंड ग्रोथ में पानी की आवश्यकता सर्वाधिक होती है।',
  'Grand growth stage has the highest water demand in sugarcane. Temperatures exceeding 40°C may impair cell elongation and sugar accumulation. Research observation; validate with local KVK.'
),

(
  'sugarcane', 'grand_growth', 'precipitation_mm', 'gt', 100, 'mm/day',
  'Waterlogging Risk During Grand Growth', 'Moderate', 'pending_validation',
  'ICAR-IIFSR Sugarcane Crop Management', 'https://dss.iifsr.org.in/sugarcane_management.php',
  'Ensure all field drains are open and functional. Remove standing water as quickly as possible. Prolonged waterlogging during grand growth can cause root damage and significant yield loss.',
  'सभी खेत की नालियां खुली और कार्यशील रखें। जमा पानी जल्द से जल्द निकालें। ग्रैंड ग्रोथ के दौरान लंबे समय तक जलभराव से जड़ों को नुकसान और उपज में भारी कमी हो सकती है।',
  'Qualitative waterlogging risk indicator. ICAR-IIFSR emphasises drainage management throughout the crop cycle. Actual waterlogging depends on soil and drainage infrastructure. Pending validation.'
),

(
  'sugarcane', 'grand_growth', 'precipitation_mm', 'lt', 10, 'mm/day',
  'Water Stress Risk During Grand Growth',  'Low', 'pending_validation',
  'ICAR-IIFSR Sugarcane Crop Management', 'https://dss.iifsr.org.in/sugarcane_management.php',
  'Do not skip irrigation during grand growth — this is the highest water-demand stage. Maintain regular 7–10 day irrigation intervals. Apply mulch to conserve soil moisture.',
  'ग्रैंड ग्रोथ के दौरान सिंचाई न चूकें — यह सर्वाधिक पानी की आवश्यकता वाला चरण है। हर 7-10 दिन पर सिंचाई करें। नमी बचाने के लिए मल्च करें।',
  'Low rainfall during grand growth is a qualitative indicator of potential water stress. Combined with high temperatures, the risk is elevated. Pending quantitative validation.'
),

-- ── MATURITY / RIPENING STAGE ─────────────────────────────────────────────
(
  'sugarcane', 'maturity_ripening', 'precipitation_mm', 'gt', 30, 'mm/day',
  'Waterlogging Risk During Ripening', 'Low', 'pending_validation',
  'ICAR-IIFSR Sugarcane Crop Management', 'https://dss.iifsr.org.in/sugarcane_management.php',
  'Drain excess water promptly. Excess moisture during ripening can dilute sucrose content and reduce juice quality. Accelerate harvest schedule if conditions allow.',
  'अतिरिक्त पानी तुरंत निकालें। पकने के समय अधिक नमी से सुक्रोज कम हो सकता है और रस की गुणवत्ता प्रभावित हो सकती है। यदि संभव हो तो कटाई में तेजी लाएं।',
  'Qualitative waterlogging warning during ripening. Excess water can dilute sugar content. Quantitative impact depends on duration and soil drainage. Pending validation.'
),

(
  'sugarcane', 'maturity_ripening', 'min_temp_c', 'lt', 10, '°C',
  'Cold Stress During Ripening', 'Low', 'research_observation',
  'ICAR-IIFSR Sugarcane Crop Management; General Sugarcane Agronomy',
  'https://dss.iifsr.org.in/sugarcane_management.php',
  'Cold conditions during ripening can affect juice quality and sucrose concentration. Plan harvest timing to align with optimal ripening conditions. Consult KVK for local variety-specific advice.',
  'पकने के दौरान ठंड से रस की गुणवत्ता और सुक्रोज सांद्रता प्रभावित हो सकती है। इष्टतम पकने की स्थिति के अनुसार कटाई की योजना बनाएं। स्थानीय किस्म की सलाह के लिए KVK से संपर्क करें।',
  'Temperatures below 10°C during ripening may affect juice quality in sugarcane. Research observation from general sugarcane agronomy; local variety-specific validation recommended.'
);
