import fs from 'fs';
import path from 'path';

const API_KEY = 'AIzaSyBzFCwLhlsabOYl_CiZDRbPrdqw-p6DsvU';
const MODEL = 'gemini-3.1-flash-image-preview';
const OUTPUT_DIR = path.join(process.env.HOME, 'Desktop', '두부과자_쿠키스타일_13섹션');

const PRODUCT_IMG = path.join(process.env.HOME, 'Desktop', '스크린샷', '스크린샷 2026-03-20 오전 9.04.36.png');
const REF_IMG = path.join(process.env.HOME, 'Desktop', 'references', 'hero', 'G5_베이크드쿠키.png');

const productBase64 = fs.readFileSync(PRODUCT_IMG).toString('base64');
const refBase64 = fs.readFileSync(REF_IMG).toString('base64');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const sections = [
  { name: '01_hero', label: '히어로 (브랜드 첫인상)' },
  { name: '02_empathy', label: '공감 (고객 고민)' },
  { name: '03_point_01', label: '포인트 01 (핵심 셀링포인트)' },
  { name: '04_point_02', label: '포인트 02 (핵심 셀링포인트)' },
  { name: '05_point_03', label: '포인트 03 (핵심 셀링포인트)' },
  { name: '06_sizzle', label: '씨즐컷 (식욕 자극 클로즈업)' },
  { name: '07_trust', label: '신뢰 (원재료/품질)' },
  { name: '08_divider', label: '전환 배너' },
  { name: '09_lifestyle', label: '라이프스타일 (일상 속 활용)' },
  { name: '10_situation', label: '상황/TPO (다양한 즐기는 방법)' },
  { name: '11_review', label: '리뷰 (고객 후기)' },
  { name: '12_cta', label: 'CTA (구매 유도)' },
  { name: '13_spec', label: '제품 정보 (스펙/영양성분)' },
];

const SYSTEM = `당신은 한국 이커머스 상세페이지 디자인 전문가입니다.

[절대 규칙]
1. 반드시 한국어 텍스트를 정확하게 렌더링하세요
2. 레퍼런스 이미지의 디자인 톤, 색감, 타이포그래피 스타일을 기반으로 하되, 각 섹션마다 레이아웃을 변주하세요
3. 제품 이미지의 패키지 디자인을 정확하게 반영하세요 — 색상, 형태, 텍스트 왜곡 없이
4. 전체 상세페이지가 하나의 톤으로 자연스럽게 이어지도록 톤 & 무드를 일관되게 유지하세요
5. 사람 얼굴 금지 — 손/팔까지만 허용
6. 가짜 인증마크(HACCP, ISO 등), 허위 수치 생성 금지

제품명: 스낵24 두부과자 (CRUNCHY TOFU CHIPS)
제품 특징: 두부 5.14% 함유 (대두 99%), 42g, 215kcal, 오독오독 바삭한 식감, 콩을 갈아 더 고소한`;

async function generate(section, index) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
  const prompt = SYSTEM + `\n\n[섹션 ${index + 1}/13 — ${section.label}]\n이 섹션에 맞는 상세페이지 이미지를 만들어주세요.`;

  const parts = [
    { text: prompt },
    { inlineData: { mimeType: 'image/png', data: productBase64 } },
    { text: '위는 제품 이미지(스낵24 두부과자)입니다. 이 제품의 패키지 디자인을 정확히 반영하세요.' },
    { inlineData: { mimeType: 'image/png', data: refBase64 } },
    { text: '위는 레퍼런스 디자인(베이크드쿠키 상세페이지)입니다. 이 디자인의 톤, 색감, 스타일을 참고하되, 요청된 섹션에 맞게 레이아웃을 변주하세요.' },
  ];

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { responseModalities: ['TEXT', 'IMAGE'], imageConfig: { imageSize: '2K', aspectRatio: '9:16' } },
        }),
      });
      if (res.status === 429) { await new Promise(r => setTimeout(r, (attempt + 1) * 5000)); continue; }
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error?.message || `HTTP ${res.status}`); }
      const data = await res.json();
      for (const c of (data.candidates || [])) for (const p of (c.content?.parts || [])) {
        if (p.inlineData?.mimeType?.startsWith('image/')) {
          const out = path.join(OUTPUT_DIR, `${section.name}.png`);
          fs.writeFileSync(out, Buffer.from(p.inlineData.data, 'base64'));
          return out;
        }
      }
      throw new Error('이미지 없음');
    } catch (err) {
      if (attempt < 2) { await new Promise(r => setTimeout(r, 3000)); continue; }
      throw err;
    }
  }
}

async function main() {
  console.log('🚀 두부과자 × 베이크드쿠키 스타일 13섹션');
  console.log(`📁 ${OUTPUT_DIR}\n`);
  for (let i = 0; i < sections.length; i++) {
    console.log(`🎨 [${i+1}/13] ${sections[i].label}...`);
    try {
      const p = await generate(sections[i], i);
      console.log(`   ✅ ${p}`);
    } catch (err) { console.log(`   ❌ ${err.message}`); }
    if (i < sections.length - 1) await new Promise(r => setTimeout(r, 3000));
  }
  console.log('\n완료!');
}
main().catch(console.error);
