export const TCM_KNOWLEDGE_BASE = [
  {
    "id": "damp_heat",
    "name": "大肠湿热证",
    "source": "《溃疡性结肠炎中医诊疗共识》",
    "diagnostic_criteria": {
      "primary_symptoms": [
        { "id": "s1", "text": "腹泻，大便夹脓血黏液", "weight": 3 },
        { "id": "s2", "text": "腹痛，里急后重", "weight": 3 },
        { "id": "s3", "text": "肛门灼热", "weight": 2 }
      ],
      "secondary_symptoms": [
        { "id": "s4", "text": "口苦口干", "weight": 1 },
        { "id": "s5", "text": "小便短黄", "weight": 1 },
        { "id": "s6", "text": "身热或低热", "weight": 1 }
      ],
      "tongue": {
        "color": ["红舌"],
        "coating": ["黄腻苔", "黄厚苔"]
      },
      "pulse": ["滑数", "弦滑数"],
      "min_primary_score": 5
    },
    "differentiation_notes": "与脾虚湿滞证鉴别：本证以实热为主，腹泻急迫，脓血量多；脾虚湿滞以虚为主，大便溏薄，脓血量少或无。",
    "lab_correlation": "CRP 偏高，ESR 升高，与炎症活动期相符",
    "treatment": {
      "principle": "清热化湿，调气行血",
      "formula": "芍药汤加减",
      "key_herbs": ["白芍", "黄连", "黄芩", "大黄", "当归", "木香", "槟榔", "甘草"],
      "formula_rationale": "白芍、甘草缓急止痛；黄连、黄芩清热燥湿；木香、槟榔调气导滞"
    },
    "lifestyle_advice": "忌辛辣油腻食物，清淡饮食，避免劳累，急性期注意休息"
  },
  {
    "id": "spleen_deficiency",
    "name": "脾虚湿滞证",
    "source": "《溃疡性结肠炎中医诊疗共识》",
    "diagnostic_criteria": {
      "primary_symptoms": [
        { "id": "s7", "text": "大便溏薄，夹有黏液", "weight": 3 },
        { "id": "s8", "text": "神疲懒言", "weight": 2 },
        { "id": "s9", "text": "纳呆腹胀", "weight": 2 }
      ],
      "secondary_symptoms": [
        { "id": "s10", "text": "面色萎黄", "weight": 1 },
        { "id": "s11", "text": "肢体倦怠", "weight": 1 }
      ],
      "tongue": {
        "color": ["淡红舌", "淡胖舌"],
        "coating": ["白腻苔", "白滑苔"]
      },
      "pulse": ["濡缓", "细弱"],
      "min_primary_score": 4
    },
    "differentiation_notes": "以脾虚为本，湿滞为标。大便多溏而不爽，脓血不明显。",
    "lab_correlation": "白蛋白可能偏低，贫血指标轻度异常",
    "treatment": {
      "principle": "健脾益气，化湿止泻",
      "formula": "参苓白术散加减",
      "key_herbs": ["人参", "白术", "茯苓", "山药", "薏苡仁", "莲子", "砂仁", "桔梗"],
      "formula_rationale": "人参、白术、茯苓健脾益气；山药、薏苡仁渗湿止泻"
    },
    "lifestyle_advice": "宜食易消化食物，忌生冷油腻，注意腹部保暖"
  },
  {
    "id": "spleen_kidney_yang_deficiency",
    "name": "脾肾阳虚证",
    "source": "《溃疡性结肠炎中医诊疗共识》",
    "diagnostic_criteria": {
      "primary_symptoms": [
        { "id": "s12", "text": "黎明前腹泻（五更泻）", "weight": 3 },
        { "id": "s13", "text": "形寒肢冷", "weight": 3 },
        { "id": "s14", "text": "腰膝酸软", "weight": 2 }
      ],
      "secondary_symptoms": [
        { "id": "s15", "text": "大便清稀无臭", "weight": 1 },
        { "id": "s16", "text": "腹部冷痛，喜温喜按", "weight": 1 }
      ],
      "tongue": {
        "color": ["淡白舌", "胖大舌"],
        "coating": ["白滑苔"]
      },
      "pulse": ["沉迟", "微细"],
      "min_primary_score": 5
    },
    "differentiation_notes": "常见于病程较长、反复发作的患者。以命门火衰、不能温煦脾土为核心。",
    "lab_correlation": "HGB 偏低，ALB 偏低，营养不良表现",
    "treatment": {
      "principle": "温补脾肾，固涩止泻",
      "formula": "理中汤合四神丸加减",
      "key_herbs": ["人参", "白术", "干姜", "补骨脂", "肉豆蔻", "吴茱萸", "五味子"],
      "formula_rationale": "理中汤温中散寒；四神丸温肾暖脾，涩肠止泻"
    },
    "lifestyle_advice": "注意防寒保暖，尤其是腹部和足部；饮食宜温热，忌食生冷寒凉之品"
  },
  {
    "id": "liver_spleen_disharmony",
    "name": "肝郁脾虚证",
    "source": "《溃疡性结肠炎中医诊疗共识》",
    "diagnostic_criteria": {
      "primary_symptoms": [
        { "id": "s17", "text": "腹痛即泻，泻后痛减", "weight": 3 },
        { "id": "s18", "text": "情绪波动时症状加重", "weight": 3 },
        { "id": "s19", "text": "胸胁胀闷", "weight": 2 }
      ],
      "secondary_symptoms": [
        { "id": "s20", "text": "嗳气频作", "weight": 1 },
        { "id": "s21", "text": "食欲不振", "weight": 1 }
      ],
      "tongue": {
        "color": ["淡红舌", "边红"],
        "coating": ["薄白苔"]
      },
      "pulse": ["弦细", "弦缓"],
      "min_primary_score": 5
    },
    "differentiation_notes": "症状发作或加重常与情绪变化（如紧张、生气）密切相关。",
    "lab_correlation": "炎症指标可能正常或轻度升高，常伴有肠易激综合征重叠",
    "treatment": {
      "principle": "疏肝解郁，健脾止泻",
      "formula": "痛泻要方加减",
      "key_herbs": ["白术", "白芍", "陈皮", "防风", "柴胡", "枳壳"],
      "formula_rationale": "白术健脾燥湿；白芍柔肝止痛；陈皮理气和胃；防风散肝舒脾"
    },
    "lifestyle_advice": "保持心情舒畅，避免情绪激动和精神紧张；适当进行放松训练"
  },
  {
    "id": "yin_blood_deficiency",
    "name": "阴血亏虚证",
    "source": "《溃疡性结肠炎中医诊疗共识》",
    "diagnostic_criteria": {
      "primary_symptoms": [
        { "id": "s22", "text": "大便干结或便下鲜血", "weight": 3 },
        { "id": "s23", "text": "形体消瘦", "weight": 3 },
        { "id": "s24", "text": "五心烦热", "weight": 2 }
      ],
      "secondary_symptoms": [
        { "id": "s25", "text": "口干咽燥", "weight": 1 },
        { "id": "s26", "text": "盗汗", "weight": 1 },
        { "id": "s27", "text": "头晕目眩", "weight": 1 }
      ],
      "tongue": {
        "color": ["红绛舌", "瘦小舌"],
        "coating": ["少苔", "无苔"]
      },
      "pulse": ["细数"],
      "min_primary_score": 5
    },
    "differentiation_notes": "多见于疾病晚期或长期便血导致阴血耗伤的患者。",
    "lab_correlation": "显著的 HGB 降低（贫血），可能伴有电解质紊乱",
    "treatment": {
      "principle": "滋阴养血，清肠止血",
      "formula": "驻车丸合黄连阿胶汤加减",
      "key_herbs": ["黄连", "阿胶", "黄芩", "白芍", "当归", "生地黄", "干姜"],
      "formula_rationale": "阿胶、当归、生地黄滋阴养血；黄连、黄芩清热燥湿；干姜温中"
    },
    "lifestyle_advice": "进食高营养、易消化的流质或半流质食物，注意补充水分和电解质"
  }
];
