/**
 * Gemini API 이미지 생성 - 두부과자 상세페이지 15섹션
 * 레퍼런스(파스타칩) 톤 유지 + 섹션별 변주
 */
import fs from 'fs';
import path from 'path';

const API_KEY = 'AIzaSyCtaAwx_PjMdCmK2iporqXD3dMIINpe1qE';
const MODEL = 'gemini-3.1-flash-image-preview'; // Nano Banana 2
const OUTPUT_DIR = path.join(process.env.HOME, 'Desktop', '두부과자_상세페이지_AI');

// 이미지 로드
const PRODUCT_IMG_PATH = path.join(process.env.HOME, 'Desktop', '스크린샷 2026-03-20 오전 9.04.36.png');
const REF_IMG_PATH = path.join(process.env.HOME, 'detailcraft-v2', 'public', 'references', 'hero', 'G3_파스타칩.png');

const productBase64 = fs.readFileSync(PRODUCT_IMG_PATH).toString('base64');
const refBase64 = fs.readFileSync(REF_IMG_PATH).toString('base64');

// 출력 폴더 생성
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// 15개 섹션 정의
const sections = [
  {
    name: '01_hero',
    ratio: '9:16',
    prompt: `[섹션 01 - 히어로]
이 상세페이지의 첫 번째 섹션입니다.
레퍼런스 이미지의 디자인 톤(따뜻한 베이지/크림 배경, 깔끔한 타이포그래피, 고급스러운 푸드 스타일링)을 그대로 유지하면서,
제품 이미지(스낵24 두부과자)를 중앙에 크게 배치하세요.

텍스트 내용:
- 상단: "SNACK 24" (작은 영문 로고)
- 메인 헤드라인: "고소하고 담백한, 두부과자"
- 영문: "CRUNCHY TOFU CHIPS"
- 제품 패키지 이미지를 중앙에 크고 선명하게
- 주변에 두부 큐브, 대두, 파슬리 등 원재료를 자연스럽게 스타일링
- 하단에 "콩을 갈아 더 고소한!" 배지

분위기: 밝고 깨끗한 오프화이트/베이지 톤, 자연스러운 그림자, 프리미엄 식품 느낌`
  },
  {
    name: '02_empathy',
    ratio: '9:16',
    prompt: `[섹션 02 - 공감/고민]
레퍼런스의 따뜻한 베이지/크림 톤을 유지하면서, 텍스트 중심의 공감 섹션을 만드세요.
제품 이미지는 사용하지 마세요. 텍스트와 그래픽 요소만 사용합니다.

텍스트 내용:
- 소제목: "THINK ABOUT IT"
- 메인 헤드라인: "간식은 먹고 싶은데, 건강은 포기 못 하는 당신"
- 서브카피: "자극적인 과자 대신 담백한 한 입이 필요할 때"
- 3개 고민 카드:
  1) "밀가루 과자의 부담감" - 기름지고 칼로리 높은 일반 스낵
  2) "건강 간식의 맛 걱정" - 건강하다는데 맛이 없으면?
  3) "단백질 섭취 고민" - 맛있으면서 단백질까지

레이아웃: 깔끔한 카드형, 부드러운 베이지 배경
제품 이미지를 절대 포함하지 마세요.`
  },
  {
    name: '03_point_01',
    ratio: '9:16',
    prompt: `[섹션 04 - 포인트 01: 두부 함유]
레퍼런스 디자인 스타일 유지. 좌우 분할 레이아웃.

텍스트 내용:
- 상단: "Point 01"
- 헤드라인: "엄선한 국내산 대두 사용, 깊고 풍부한 고소함"
- 서브카피: "두부 5.14% 함유 (대두 99%)"
- 설명: "콩의 고소함을 그대로 살린 담백한 맛의 비결"

비주얼:
- 왼쪽: 텍스트 영역
- 오른쪽: 제품 패키지 + 대두/두부 큐브가 주변에 자연스럽게 배치
- 베이지/크림 배경, 나무 질감 소품 활용
- 레퍼런스처럼 재료가 풍성하게 스타일링된 푸드 포토 느낌`
  },
  {
    name: '04_point_02',
    ratio: '9:16',
    prompt: `[섹션 05 - 포인트 02: 바삭한 식감]
레퍼런스 톤 유지. 이전 섹션과 다른 레이아웃으로 변주.

텍스트 내용:
- 상단: "Point 02"
- 헤드라인: "고온으로 구워 더욱 바삭하고 건강한 크런치"
- 서브카피: "오독! 오독! 멈출 수 없는 식감"

비주얼:
- 두부과자를 봉지에서 쏟아져 나오듯 역동적으로 배치
- 과자 조각들이 공중에 떠있는 듯한 다이나믹한 구도
- 바삭한 텍스처가 느껴지도록 클로즈업 요소 포함
- 배경: 밝은 베이지, 그림자로 입체감`
  },
  {
    name: '05_point_03',
    ratio: '9:16',
    prompt: `[섹션 06 - 포인트 03: 콩의 풍미]
레퍼런스 톤 유지. 또 다른 레이아웃 변주.

텍스트 내용:
- 상단: "Point 03"
- 헤드라인: "오독오독, 콩의 깊은 풍미가 가득"
- 서브카피: "콩을 갈아 넣어 더 고소함"

비주얼:
- 중앙 또는 하단에 제품 이미지
- 대두, 두부, 파슬리 등 원재료를 아름답게 배치
- 인포그래픽 요소: 원재료 → 제조과정 → 완성 흐름
- 자연스러운 나뭇잎, 허브 데코레이션
- 베이지/크림 배경 유지`
  },
  {
    name: '06_sizzle',
    ratio: '9:16',
    prompt: `[섹션 07 - 시즐 (식욕 자극)]
레퍼런스 톤 유지. 제품의 맛있는 모습을 극대화하는 섹션.

텍스트 내용:
- 최소한의 텍스트: "고소함이 눈에 보이는"
- 작은 서브: "한 입 베어물면 멈출 수 없는"

비주얼:
- 두부과자를 매우 크게, 식욕을 자극하는 앵글로
- 과자 조각 클로즈업, 바삭한 단면이 보이도록
- 주변에 대두, 허브 등 원재료 소품
- 밝고 따뜻한 베이지/크림 배경 (레퍼런스와 동일한 밝은 톤 유지)
- 자연광 느낌의 밝은 조명
- 프리미엄 푸드 포토그래피 느낌`
  },
  {
    name: '07_trust',
    ratio: '9:16',
    prompt: `[섹션 09 - 신뢰/원재료]
레퍼런스 톤 유지. 원재료 신뢰감을 전달하는 섹션.

텍스트 내용:
- 상단: "TRUST"
- 헤드라인: "믿을 수 있는 원재료"
- 서브: "꼼꼼하게 따져본 성분, 안심하고 드세요"
- 3가지 포인트:
  1) "대두 99%" - 엄선된 대두로 만든 두부
  2) "담백한 제조" - 두부를 갈아 반죽에 넣어 구운 공법
  3) "간편한 포장" - 42g 개별 포장

비주얼:
- 3개의 깔끔한 카드 또는 아이콘 + 텍스트
- 대두, 두부 등 원재료 사진을 자연스럽게
- 베이지 배경, 원형 또는 라운드 카드`
  },
  {
    name: '08_divider',
    ratio: '9:16',
    prompt: `[섹션 08 - 전환 배너]
레퍼런스의 따뜻한 톤 유지. 시선을 환기하는 전환 섹션.

텍스트 내용:
- 메인: "한 입 베어물면 멈출 수 없는 고소함"
- 서브: "SNACK 24 CRUNCHY TOFU CHIPS"

[절대 규칙]
- 제품 이미지는 딱 1번만 배치하세요. 절대로 반복하지 마세요.
- 하나의 통일된 구성으로 만드세요. 여러 컷을 나누거나 반복하지 마세요.

비주얼:
- 밝은 베이지/크림 배경 (레퍼런스와 동일)
- 상단에 큰 타이포그래피
- 중앙~하단에 제품 패키지를 1개만 크게 배치
- 주변에 두부과자 조각들이 흩어진 역동적 구성
- 대두, 파슬리 등 원재료 소품으로 장식
- 밝고 깨끗한 자연광 느낌`
  },
  {
    name: '09_lifestyle',
    ratio: '9:16',
    prompt: `[섹션 11 - 라이프스타일]
레퍼런스 톤 유지. 일상 속 활용 장면.

텍스트 내용:
- 상단: "LIFESTYLE"
- 헤드라인: "일상 속 두부과자"
- 서브: "하루 중 언제든, 가볍게 즐기는 건강 간식"
- 4가지 상황:
  1) 오후 티타임 - 커피와 함께
  2) 영화 감상 - 부담 없는 스낵
  3) 사무실 간식 - 출출한 오후
  4) 나들이 간식 - 여행, 피크닉

비주얼:
- 2x2 그리드 또는 카드 레이아웃
- 각 상황을 심플한 아이콘이나 일러스트로
- 밝고 따뜻한 베이지 톤 유지
- 제품 이미지를 중앙이나 상단에 작게`
  },
  {
    name: '10_situation',
    ratio: '9:16',
    prompt: `[섹션 10 - 상황/TPO 페어링]
레퍼런스 톤 유지. 다양한 즐기는 방법을 보여주는 섹션.

텍스트 내용:
- 상단: "ENJOY WITH"
- 헤드라인: "이렇게 즐겨보세요"

[절대 규칙 - 레이아웃]
- 정확히 4등분 그리드(2x2)로 구성하세요.
- 각 칸 사이에 반드시 흰색 구분선(약 8px 두께)을 넣어 명확히 분리하세요.
- 4칸의 크기는 모두 동일해야 합니다.
- 각 칸 안에 하나의 상황 사진 + 텍스트 라벨을 배치하세요.

4칸 내용:
  좌상단) 커피와 함께 - 커피잔 + 두부과자가 나무 트레이 위에
  우상단) 맥주 안주로 - 맥주잔 + 두부과자가 접시 위에
  좌하단) 샐러드 토핑 - 샐러드 위에 부순 두부과자
  우하단) 아이 간식 - 아이 도시락/접시에 두부과자

비주얼:
- 각 칸마다 독립적인 스타일링 사진
- 따뜻한 조명, 나무 테이블 배경
- 베이지/크림 톤 통일`
  },
  {
    name: '11_review',
    ratio: '9:16',
    prompt: `[섹션 13 - 리뷰/후기]
레퍼런스 톤 유지. 고객 후기 섹션.

텍스트 내용:
- 상단: "REAL REVIEW"
- 헤드라인: "이미 경험한 분들의 후기"
- 후기 3개:
  ★★★★★ "두부라서 걱정했는데 진짜 고소하고 바삭해요!"
  ★★★★★ "다이어트 중인데 죄책감 없이 먹을 수 있어서 좋아요"
  ★★★★☆ "아이 간식으로 사줬는데 오독오독 식감을 좋아해요"

비주얼:
- 말풍선 또는 카드형 리뷰 레이아웃
- 별점 표시
- 베이지/크림 배경
- 하단에 제품 이미지 작게
- 깔끔하고 신뢰감 있는 디자인`
  },
  {
    name: '12_cta',
    ratio: '9:16',
    prompt: `[섹션 14 - CTA (구매 유도)]
레퍼런스 톤 유지. 구매를 유도하는 마무리 섹션.

텍스트 내용:
- 헤드라인: "고소하고 담백한 스낵24 두부과자"
- 서브: "콩을 갈아 만든 바삭한 한 조각, 지금 바로 만나보세요"
- CTA 버튼: "구매하기"

비주얼:
- 중앙에 제품 패키지를 크고 선명하게
- 주변에 대두, 허브 등 자연스러운 소품
- 밝고 따뜻한 베이지 배경
- "구매하기" 버튼은 그린 또는 브라운 계열 라운드 버튼
- 프리미엄하면서도 친근한 마무리 느낌`
  },
  {
    name: '13_spec',
    ratio: '9:16',
    prompt: `[섹션 15 - 제품 스펙/정보]
레퍼런스 톤 유지. 제품 상세 정보 섹션.

텍스트 내용:
- 상단: "PRODUCT INFO"
- 헤드라인: "제품 상세 정보"
- 테이블 형태:
  제품명: 스낵24 두부과자
  영문명: CRUNCHY TOFU CHIPS
  내용량: 42g
  열량: 215 kcal
  원재료: 두부 5.14% (대두 99%)
  보관방법: 직사광선을 피하고 서늘한 곳에 보관
- 하단 주의사항:
  ※ 본 제품은 대두를 사용한 제품입니다
  ※ 이미지는 실제와 다를 수 있습니다

비주얼:
- 왼쪽에 제품 이미지
- 오른쪽에 깔끔한 테이블 레이아웃
- 미니멀, 정보 전달 중심
- 밝은 베이지/화이트 배경`
  },
];

// 공통 시스템 프롬프트
const SYSTEM_PROMPT = `당신은 한국 이커머스 상세페이지 디자인 전문가입니다.

[절대 규칙]
1. 반드시 한국어 텍스트를 정확하게 렌더링하세요
2. 레퍼런스 이미지(파스타칩 상세페이지)의 디자인 톤, 색감, 타이포그래피 스타일을 기반으로 하되, 각 섹션마다 레이아웃을 변주하세요
3. 제품 이미지(스낵24 두부과자)의 패키지 디자인을 정확하게 반영하세요 - 색상, 형태, 텍스트 왜곡 없이
4. 전체 15개 섹션이 하나의 상세페이지로 자연스럽게 이어지도록 톤 & 무드를 일관되게 유지하세요
5. 색상 팔레트: 따뜻한 베이지(#F5EDE4), 크림(#FAF6F0), 다크 브라운(#4A3728), 그린 포인트(#6B8E23)
6. 타이포그래피: 한국어는 깔끔한 산세리프, 영문은 세리프 또는 클래식 산세리프
7. 전체적으로 자연스럽고 건강한 느낌의 푸드 스타일링

이 이미지는 860px 너비의 이커머스 상세페이지 섹션입니다.
한국 온라인 쇼핑몰(스마트스토어, 쿠팡 등)에서 사용되는 고품질 상세페이지를 만들어주세요.`;

async function generateSectionImage(section, index) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

  const parts = [
    { text: SYSTEM_PROMPT + '\n\n' + section.prompt },
    {
      inlineData: {
        mimeType: 'image/png',
        data: productBase64,
      },
    },
    {
      text: '위는 제품 이미지(스낵24 두부과자)입니다. 이 제품의 패키지 디자인을 정확히 반영하세요.',
    },
    {
      inlineData: {
        mimeType: 'image/png',
        data: refBase64,
      },
    },
    {
      text: '위는 레퍼런스 디자인(파스타칩 상세페이지)입니다. 이 디자인의 톤, 색감, 스타일을 참고하되, 요청된 섹션에 맞게 레이아웃을 변주하세요.',
    },
  ];

  const body = {
    contents: [{ parts }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: {
        imageSize: '2K',
        aspectRatio: section.ratio,
      },
    },
  };

  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.status === 429) {
        const delay = Math.pow(2, attempt) * 5000;
        console.log(`   ⏳ Rate limit, ${delay / 1000}초 대기 후 재시도...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const candidates = data.candidates || [];

      for (const candidate of candidates) {
        const respParts = candidate.content?.parts || [];
        for (const part of respParts) {
          if (part.inlineData?.mimeType?.startsWith('image/')) {
            const outputPath = path.join(OUTPUT_DIR, `${section.name}.png`);
            const imgBuffer = Buffer.from(part.inlineData.data, 'base64');
            fs.writeFileSync(outputPath, imgBuffer);
            return outputPath;
          }
        }
      }

      throw new Error('이미지가 응답에 없습니다');
    } catch (err) {
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 3000;
        console.log(`   ⚠️ 오류: ${err.message}, ${delay / 1000}초 후 재시도...`);
        await new Promise((r) => setTimeout(r, delay));
      } else {
        throw err;
      }
    }
  }
}

async function main() {
  console.log('🚀 Gemini AI 이미지 생성 시작');
  console.log(`📁 출력 폴더: ${OUTPUT_DIR}`);
  console.log(`📸 총 ${sections.length}개 섹션 생성 예정\n`);

  const results = { success: [], failed: [] };

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    console.log(`🎨 [${i + 1}/${sections.length}] ${section.name} 생성 중...`);

    try {
      const outputPath = await generateSectionImage(section, i);
      console.log(`   ✅ 저장: ${outputPath}`);
      results.success.push(section.name);
    } catch (err) {
      console.log(`   ❌ 실패: ${err.message}`);
      results.failed.push({ name: section.name, error: err.message });
    }

    // Rate limit 방지: 섹션 간 3초 딜레이
    if (i < sections.length - 1) {
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  console.log('\n========== 결과 ==========');
  console.log(`✅ 성공: ${results.success.length}개`);
  console.log(`❌ 실패: ${results.failed.length}개`);
  if (results.failed.length > 0) {
    results.failed.forEach((f) => console.log(`   - ${f.name}: ${f.error}`));
  }
  console.log(`\n📁 저장 위치: ${OUTPUT_DIR}`);
}

main().catch(console.error);
