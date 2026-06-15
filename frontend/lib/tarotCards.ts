export type TarotCard = {
  id: number;
  number: string;
  name: string;
  koreanName: string;
  image: string;
  keywords: string[];
  uprightMeaning: string;
  reversedMeaning: string;
  shortMessage: string;
};

export const tarotCards: TarotCard[] = [
  {
    id: 0,
    number: "00",
    name: "The Fool",
    koreanName: "바보",
    image: "/images/tarot/cards/major-00.png",
    keywords: ["새로운 시작", "호기심", "자유", "가능성"],
    uprightMeaning: "아직 정답을 몰라도 괜찮습니다. 가벼운 마음으로 첫걸음을 내딛으면 예상하지 못한 가능성이 열릴 수 있어요.",
    reversedMeaning: "충동적으로 뛰어들기보다 작은 준비를 먼저 해보세요. 설렘과 현실 점검의 균형이 필요합니다.",
    shortMessage: "완벽하지 않아도 시작할 수 있어요."
  },
  {
    id: 1,
    number: "01",
    name: "The Magician",
    koreanName: "마술사",
    image: "/images/tarot/cards/major-01.png",
    keywords: ["실행력", "창의성", "자원", "표현"],
    uprightMeaning: "이미 필요한 재료는 꽤 많이 갖추고 있습니다. 생각을 말과 행동으로 옮길 때 흐름이 만들어질 거예요.",
    reversedMeaning: "하고 싶은 것이 많아 에너지가 흩어질 수 있습니다. 하나의 목표를 정하고 작게 실행해보세요.",
    shortMessage: "당신 안의 도구를 믿어보세요."
  },
  {
    id: 2,
    number: "02",
    name: "The High Priestess",
    koreanName: "여교황",
    image: "/images/tarot/cards/major-02.png",
    keywords: ["직감", "내면", "비밀", "침착함"],
    uprightMeaning: "겉으로 드러난 정보보다 마음 깊은 곳의 감각이 중요한 때입니다. 서두르지 않으면 더 선명하게 보일 거예요.",
    reversedMeaning: "불안과 직감을 혼동하고 있을 수 있습니다. 잠시 거리를 두고 사실과 감정을 나누어 살펴보세요.",
    shortMessage: "조용한 마음이 답을 알고 있어요."
  },
  {
    id: 3,
    number: "03",
    name: "The Empress",
    koreanName: "여제",
    image: "/images/tarot/cards/major-03.png",
    keywords: ["풍요", "돌봄", "성장", "감성"],
    uprightMeaning: "무언가가 천천히 자라고 있습니다. 자신과 주변을 다정하게 돌볼수록 결과도 부드럽게 무르익을 거예요.",
    reversedMeaning: "너무 많이 챙기느라 스스로를 비워두고 있진 않은지 살펴보세요. 돌봄은 나에게도 필요합니다.",
    shortMessage: "다정하게 키운 것은 결국 피어납니다."
  },
  {
    id: 4,
    number: "04",
    name: "The Emperor",
    koreanName: "황제",
    image: "/images/tarot/cards/major-04.png",
    keywords: ["안정", "책임", "질서", "리더십"],
    uprightMeaning: "흔들리는 상황에 기준을 세우기 좋은 때입니다. 계획과 책임감이 당신에게 든든한 울타리가 되어줄 거예요.",
    reversedMeaning: "통제하려는 마음이 강해지면 유연함을 잃을 수 있습니다. 원칙은 지키되 여백도 남겨보세요.",
    shortMessage: "단단한 기준이 길을 만들어줍니다."
  },
  {
    id: 5,
    number: "05",
    name: "The Hierophant",
    koreanName: "교황",
    image: "/images/tarot/cards/major-05.png",
    keywords: ["배움", "조언", "전통", "신뢰"],
    uprightMeaning: "혼자 해결하려 애쓰기보다 믿을 만한 조언이나 검증된 방법을 참고해보세요. 배움 속에서 안정감을 찾을 수 있습니다.",
    reversedMeaning: "남의 기준에 너무 맞추고 있을 수 있습니다. 조언은 참고하되 마지막 선택은 나답게 해도 괜찮아요.",
    shortMessage: "좋은 조언은 마음을 더 넓게 해줍니다."
  },
  {
    id: 6,
    number: "06",
    name: "The Lovers",
    koreanName: "연인",
    image: "/images/tarot/cards/major-06.png",
    keywords: ["선택", "관계", "조화", "진심"],
    uprightMeaning: "마음이 향하는 방향과 실제 선택이 만나는 순간입니다. 진심을 기준으로 고르면 후회가 줄어들 거예요.",
    reversedMeaning: "상대나 상황에 맞추느라 나의 마음을 놓치고 있을 수 있습니다. 원하는 것을 솔직히 확인해보세요.",
    shortMessage: "진심을 선택할 때 관계도 선명해집니다."
  },
  {
    id: 7,
    number: "07",
    name: "The Chariot",
    koreanName: "전차",
    image: "/images/tarot/cards/major-07.png",
    keywords: ["전진", "의지", "집중", "승부"],
    uprightMeaning: "방향을 정했다면 힘 있게 나아갈 수 있습니다. 흔들림이 있어도 목표를 붙잡으면 속도가 붙을 거예요.",
    reversedMeaning: "마음은 급한데 방향이 흐릴 수 있습니다. 속도를 내기 전 목적지를 다시 확인해보세요.",
    shortMessage: "방향을 잡으면 바람도 당신 편이 됩니다."
  },
  {
    id: 8,
    number: "08",
    name: "Strength",
    koreanName: "힘",
    image: "/images/tarot/cards/major-08.png",
    keywords: ["용기", "인내", "부드러운 힘", "자기신뢰"],
    uprightMeaning: "강하게 밀어붙이기보다 부드럽게 버티는 힘이 더 빛나는 때입니다. 당신의 차분함이 상황을 안정시킬 수 있어요.",
    reversedMeaning: "스스로를 몰아붙이면 쉽게 지칠 수 있습니다. 지금 필요한 힘은 채찍보다 격려에 가깝습니다.",
    shortMessage: "가장 부드러운 마음도 큰 힘이 됩니다."
  },
  {
    id: 9,
    number: "09",
    name: "The Hermit",
    koreanName: "은자",
    image: "/images/tarot/cards/major-09.png",
    keywords: ["성찰", "거리두기", "지혜", "탐색"],
    uprightMeaning: "잠시 혼자 생각할 시간이 도움이 됩니다. 조용히 돌아보면 바깥의 소음 속에서 놓친 답을 발견할 수 있어요.",
    reversedMeaning: "고립이 길어지면 마음이 더 좁아질 수 있습니다. 혼자만의 시간 후에는 작은 대화도 열어보세요.",
    shortMessage: "잠깐 멈추면 더 멀리 볼 수 있어요."
  },
  {
    id: 10,
    number: "10",
    name: "Wheel of Fortune",
    koreanName: "운명의 수레바퀴",
    image: "/images/tarot/cards/major-10.png",
    keywords: ["전환점", "흐름", "기회", "변화"],
    uprightMeaning: "흐름이 바뀌는 지점에 서 있습니다. 예상 밖의 변화도 새로운 기회로 이어질 수 있으니 열린 마음을 가져보세요.",
    reversedMeaning: "변화를 억지로 붙잡으려 하면 더 피곤해질 수 있습니다. 통제할 수 있는 작은 선택에 집중해보세요.",
    shortMessage: "흐름은 바뀌고, 기회도 함께 옵니다."
  },
  {
    id: 11,
    number: "11",
    name: "Justice",
    koreanName: "정의",
    image: "/images/tarot/cards/major-11.png",
    keywords: ["균형", "공정함", "판단", "책임"],
    uprightMeaning: "감정보다 기준과 사실을 차분히 살필 때입니다. 공정한 선택이 장기적으로 마음을 편하게 해줄 거예요.",
    reversedMeaning: "한쪽으로 치우친 판단을 하고 있을 수 있습니다. 나와 상대, 현실 조건을 함께 놓고 다시 보세요.",
    shortMessage: "차분한 기준이 마음의 저울을 맞춥니다."
  },
  {
    id: 12,
    number: "12",
    name: "The Hanged Man",
    koreanName: "매달린 사람",
    image: "/images/tarot/cards/major-12.png",
    keywords: ["기다림", "관점 전환", "멈춤", "수용"],
    uprightMeaning: "당장 움직이지 않는 시간이 의미 없지는 않습니다. 관점을 바꾸면 막힌 상황에서도 새로운 이해가 생길 수 있어요.",
    reversedMeaning: "기다림이 핑계가 되어 미루고 있을 수 있습니다. 내려놓을 것과 시작할 것을 구분해보세요.",
    shortMessage: "다르게 보면 길도 다르게 보입니다."
  },
  {
    id: 13,
    number: "13",
    name: "Death",
    koreanName: "죽음",
    image: "/images/tarot/cards/major-13.png",
    keywords: ["마무리", "전환", "해방", "새 출발"],
    uprightMeaning: "끝나는 것이 있어야 새롭게 들어올 자리도 생깁니다. 변화는 낯설지만 당신을 더 가볍게 만들 수 있어요.",
    reversedMeaning: "놓아야 할 것을 붙잡느라 다음 장면이 늦어질 수 있습니다. 작은 정리부터 시작해보세요.",
    shortMessage: "끝은 새로운 시작의 문이 되기도 합니다."
  },
  {
    id: 14,
    number: "14",
    name: "Temperance",
    koreanName: "절제",
    image: "/images/tarot/cards/major-14.png",
    keywords: ["조율", "회복", "균형", "인내"],
    uprightMeaning: "서로 다른 것들을 천천히 맞춰가는 시간이 필요합니다. 급히 결론내기보다 조율하면 더 편안한 답이 나올 거예요.",
    reversedMeaning: "생활 리듬이나 감정의 균형이 흐트러졌을 수 있습니다. 무리한 선택보다 회복을 먼저 챙겨보세요.",
    shortMessage: "조금씩 맞춰가도 충분합니다."
  },
  {
    id: 15,
    number: "15",
    name: "The Devil",
    koreanName: "악마",
    image: "/images/tarot/cards/major-15.png",
    keywords: ["집착", "유혹", "욕망", "패턴"],
    uprightMeaning: "마음이 강하게 끌리는 이유를 들여다볼 때입니다. 욕망을 부정하기보다 건강한 방식으로 다루면 힘이 됩니다.",
    reversedMeaning: "반복되는 패턴에서 벗어날 기회가 있습니다. 나를 묶는 생각이나 관계를 조금씩 느슨하게 해보세요.",
    shortMessage: "나를 붙잡는 것을 알아차리면 선택이 생깁니다."
  },
  {
    id: 16,
    number: "16",
    name: "The Tower",
    koreanName: "탑",
    image: "/images/tarot/cards/major-16.png",
    keywords: ["깨달음", "변화", "해체", "재정비"],
    uprightMeaning: "갑작스러운 변화가 기존의 틀을 흔들 수 있습니다. 하지만 무너진 자리에서 더 솔직한 구조를 다시 세울 수 있어요.",
    reversedMeaning: "불편한 신호를 외면하면 변화가 더 커질 수 있습니다. 작은 균열을 지금 점검해보는 것이 좋습니다.",
    shortMessage: "흔들림은 새로 세우라는 신호일 수 있어요."
  },
  {
    id: 17,
    number: "17",
    name: "The Star",
    koreanName: "별",
    image: "/images/tarot/cards/major-17.png",
    keywords: ["희망", "치유", "영감", "믿음"],
    uprightMeaning: "마음에 다시 빛이 들어오는 시기입니다. 작지만 분명한 희망을 따라가면 회복의 방향이 보일 거예요.",
    reversedMeaning: "기대가 낮아져 스스로의 빛을 작게 보고 있을 수 있습니다. 아주 작은 좋은 징후부터 다시 믿어보세요.",
    shortMessage: "작은 별빛도 길을 비춥니다."
  },
  {
    id: 18,
    number: "18",
    name: "The Moon",
    koreanName: "달",
    image: "/images/tarot/cards/major-18.png",
    keywords: ["불확실성", "꿈", "감정", "상상"],
    uprightMeaning: "모든 것이 또렷하지 않아도 괜찮습니다. 지금은 감정의 물결을 살피며 천천히 진실에 가까워지는 시간입니다.",
    reversedMeaning: "상상과 걱정이 사실보다 커졌을 수 있습니다. 확인 가능한 것부터 하나씩 밝혀보세요.",
    shortMessage: "흐린 밤에도 마음은 방향을 찾습니다."
  },
  {
    id: 19,
    number: "19",
    name: "The Sun",
    koreanName: "태양",
    image: "/images/tarot/cards/major-19.png",
    keywords: ["기쁨", "성공", "명료함", "활력"],
    uprightMeaning: "밝고 건강한 에너지가 함께합니다. 솔직하게 표현하고 즐길수록 상황도 더 선명하고 가벼워질 거예요.",
    reversedMeaning: "좋은 일이 있어도 온전히 누리지 못하고 있을 수 있습니다. 작은 성취를 인정하는 연습이 필요합니다.",
    shortMessage: "당신의 밝음은 이미 충분히 빛나고 있어요."
  },
  {
    id: 20,
    number: "20",
    name: "Judgement",
    koreanName: "심판",
    image: "/images/tarot/cards/major-20.png",
    keywords: ["각성", "결정", "재평가", "부름"],
    uprightMeaning: "지난 경험을 돌아보고 다음 단계로 나아갈 준비가 되어갑니다. 중요한 결정을 통해 스스로를 새롭게 바라볼 수 있어요.",
    reversedMeaning: "후회나 자기비판이 발목을 잡을 수 있습니다. 과거를 벌하기보다 배움으로 정리해보세요.",
    shortMessage: "지난 시간은 당신을 깨우는 목소리가 됩니다."
  },
  {
    id: 21,
    number: "21",
    name: "The World",
    koreanName: "세계",
    image: "/images/tarot/cards/major-21.png",
    keywords: ["완성", "통합", "성취", "확장"],
    uprightMeaning: "하나의 여정이 의미 있게 마무리되고 있습니다. 그동안 쌓아온 경험이 다음 세계로 나아갈 발판이 되어줄 거예요.",
    reversedMeaning: "마무리 직전의 정리나 확인이 필요할 수 있습니다. 끝맺음을 서두르기보다 빠진 조각을 채워보세요.",
    shortMessage: "당신의 여정은 더 넓은 세계로 이어집니다."
  }
];
