import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = path.join(process.env.HOME, 'Desktop', '두부과자_상세페이지');
const PRODUCT_IMG = path.join(process.env.HOME, 'Desktop', '스크린샷 2026-03-20 오전 9.04.36.png');
const WIDTH = 860;

// Read product image as base64
const productBase64 = fs.readFileSync(PRODUCT_IMG).toString('base64');
const productDataUrl = `data:image/png;base64,${productBase64}`;

// Color palette inspired by reference (warm beige tones)
const COLORS = {
  bgWarm: '#F5EDE4',
  bgCream: '#FAF6F0',
  bgBrown: '#8B6914',
  bgDarkBrown: '#5C4A1E',
  bgLight: '#FFFDF9',
  bgAccent: '#E8DDD0',
  textDark: '#2C2218',
  textBrown: '#6B5B3E',
  textLight: '#8B7B5E',
  accent: '#7D9B4E',
  accentGreen: '#6B8E23',
  white: '#FFFFFF',
  divider: '#D4C4A8',
  badge: '#8B6914',
};

const sections = [
  // 1. HERO
  {
    name: '01_hero',
    height: 1200,
    html: `
      <div style="width:${WIDTH}px;height:1200px;background:linear-gradient(180deg, ${COLORS.bgCream} 0%, ${COLORS.bgWarm} 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'Noto Sans KR',sans-serif;position:relative;overflow:hidden;">
        <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:radial-gradient(ellipse at 50% 30%, rgba(255,255,255,0.6) 0%, transparent 70%);"></div>
        <div style="position:relative;z-index:1;text-align:center;">
          <div style="font-size:16px;letter-spacing:8px;color:${COLORS.textLight};margin-bottom:20px;font-weight:300;">SNACK 24</div>
          <div style="font-size:18px;color:${COLORS.textBrown};margin-bottom:8px;letter-spacing:2px;">고소하고 담백한,</div>
          <div style="font-size:64px;font-weight:900;color:${COLORS.textDark};margin-bottom:8px;letter-spacing:-2px;">두부과자</div>
          <div style="font-size:24px;color:${COLORS.textBrown};letter-spacing:6px;font-weight:300;margin-bottom:40px;">CRUNCHY TOFU CHIPS</div>
          <img src="${productDataUrl}" style="width:420px;height:auto;filter:drop-shadow(0 20px 40px rgba(0,0,0,0.15));margin-bottom:30px;" />
          <div style="display:flex;gap:20px;justify-content:center;margin-top:20px;">
            <div style="background:${COLORS.accentGreen};color:white;padding:8px 20px;border-radius:20px;font-size:14px;">콩을 갈아 더 고소한!</div>
            <div style="background:${COLORS.badge};color:white;padding:8px 20px;border-radius:20px;font-size:14px;">오독! 오독!</div>
          </div>
        </div>
      </div>
    `
  },
  // 2. EMPATHY
  {
    name: '02_empathy',
    height: 900,
    html: `
      <div style="width:${WIDTH}px;height:900px;background:${COLORS.bgLight};display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'Noto Sans KR',sans-serif;padding:60px;">
        <div style="font-size:16px;color:${COLORS.textLight};letter-spacing:4px;margin-bottom:30px;">THINK ABOUT IT</div>
        <div style="text-align:center;margin-bottom:50px;">
          <div style="font-size:36px;font-weight:700;color:${COLORS.textDark};line-height:1.5;margin-bottom:20px;">
            간식은 먹고 싶은데,<br/>건강은 포기 못 하는 당신
          </div>
          <div style="font-size:18px;color:${COLORS.textBrown};line-height:1.8;">
            자극적인 과자 대신 담백한 한 입이 필요할 때
          </div>
        </div>
        <div style="display:flex;gap:30px;width:100%;max-width:700px;">
          <div style="flex:1;background:${COLORS.bgWarm};border-radius:16px;padding:30px;text-align:center;">
            <div style="font-size:40px;margin-bottom:12px;">😮‍💨</div>
            <div style="font-size:16px;color:${COLORS.textBrown};font-weight:600;margin-bottom:8px;">밀가루 과자의 부담감</div>
            <div style="font-size:14px;color:${COLORS.textLight};">기름지고 칼로리 높은<br/>일반 스낵에 대한 죄책감</div>
          </div>
          <div style="flex:1;background:${COLORS.bgWarm};border-radius:16px;padding:30px;text-align:center;">
            <div style="font-size:40px;margin-bottom:12px;">🤔</div>
            <div style="font-size:16px;color:${COLORS.textBrown};font-weight:600;margin-bottom:8px;">건강 간식의 맛 걱정</div>
            <div style="font-size:14px;color:${COLORS.textLight};">건강하다는데<br/>맛이 없으면 어쩌지?</div>
          </div>
          <div style="flex:1;background:${COLORS.bgWarm};border-radius:16px;padding:30px;text-align:center;">
            <div style="font-size:40px;margin-bottom:12px;">💭</div>
            <div style="font-size:16px;color:${COLORS.textBrown};font-weight:600;margin-bottom:8px;">단백질 섭취 고민</div>
            <div style="font-size:14px;color:${COLORS.textLight};">맛있으면서도<br/>단백질까지 챙기고 싶은</div>
          </div>
        </div>
      </div>
    `
  },
  // 3. IMPACT TYPOGRAPHY
  {
    name: '03_impact_typo',
    height: 700,
    html: `
      <div style="width:${WIDTH}px;height:700px;background:${COLORS.bgDarkBrown};display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'Noto Sans KR',sans-serif;position:relative;overflow:hidden;">
        <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:radial-gradient(circle at 30% 50%, rgba(139,105,20,0.3) 0%, transparent 60%);"></div>
        <div style="position:relative;z-index:1;text-align:center;">
          <div style="font-size:120px;font-weight:900;color:rgba(255,255,255,0.08);position:absolute;top:-40px;left:50%;transform:translateX(-50%);white-space:nowrap;">TOFU CHIPS</div>
          <div style="font-size:20px;color:${COLORS.divider};letter-spacing:6px;margin-bottom:20px;">THE ANSWER IS</div>
          <div style="font-size:72px;font-weight:900;color:${COLORS.white};line-height:1.2;margin-bottom:20px;">
            콩으로 만든<br/>바삭한 답
          </div>
          <div style="width:60px;height:3px;background:${COLORS.accent};margin:0 auto 20px;"></div>
          <div style="font-size:18px;color:${COLORS.divider};line-height:1.6;">
            두부의 영양을 바삭한 한 조각에 담았습니다
          </div>
        </div>
      </div>
    `
  },
  // 4. POINT 1 - 두부 함유
  {
    name: '04_point_01',
    height: 950,
    html: `
      <div style="width:${WIDTH}px;height:950px;background:${COLORS.bgCream};display:flex;flex-direction:column;font-family:'Noto Sans KR',sans-serif;padding:60px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:40px;">
          <div style="font-size:14px;font-weight:700;color:${COLORS.badge};letter-spacing:4px;">POINT</div>
          <div style="font-size:48px;font-weight:900;color:${COLORS.badge};opacity:0.3;">01</div>
        </div>
        <div style="display:flex;gap:40px;flex:1;">
          <div style="flex:1;display:flex;flex-direction:column;justify-content:center;">
            <div style="font-size:36px;font-weight:800;color:${COLORS.textDark};line-height:1.4;margin-bottom:20px;">
              진짜 두부를<br/>갈아 넣었습니다
            </div>
            <div style="font-size:16px;color:${COLORS.textBrown};line-height:1.8;margin-bottom:30px;">
              두부 5.14% 함유 (대두 99%)<br/>
              콩의 고소함을 그대로 살린<br/>
              담백한 맛의 비결
            </div>
            <div style="background:${COLORS.bgWarm};border-radius:12px;padding:20px;border-left:4px solid ${COLORS.accentGreen};">
              <div style="font-size:14px;color:${COLORS.accentGreen};font-weight:700;margin-bottom:4px;">핵심 원료</div>
              <div style="font-size:24px;font-weight:800;color:${COLORS.textDark};">두부 5.14%</div>
              <div style="font-size:13px;color:${COLORS.textLight};">대두 99% 사용</div>
            </div>
          </div>
          <div style="flex:1;display:flex;align-items:center;justify-content:center;background:${COLORS.bgWarm};border-radius:24px;position:relative;overflow:hidden;">
            <img src="${productDataUrl}" style="width:320px;height:auto;filter:drop-shadow(0 10px 30px rgba(0,0,0,0.1));" />
            <div style="position:absolute;bottom:20px;right:20px;background:${COLORS.accentGreen};color:white;padding:6px 14px;border-radius:8px;font-size:13px;font-weight:600;">콩을 갈아 더 고소한!</div>
          </div>
        </div>
      </div>
    `
  },
  // 5. POINT 2 - 바삭한 식감
  {
    name: '05_point_02',
    height: 950,
    html: `
      <div style="width:${WIDTH}px;height:950px;background:${COLORS.bgLight};display:flex;flex-direction:column;font-family:'Noto Sans KR',sans-serif;padding:60px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:40px;">
          <div style="font-size:14px;font-weight:700;color:${COLORS.badge};letter-spacing:4px;">POINT</div>
          <div style="font-size:48px;font-weight:900;color:${COLORS.badge};opacity:0.3;">02</div>
        </div>
        <div style="display:flex;gap:40px;flex:1;flex-direction:row-reverse;">
          <div style="flex:1;display:flex;flex-direction:column;justify-content:center;">
            <div style="font-size:36px;font-weight:800;color:${COLORS.textDark};line-height:1.4;margin-bottom:20px;">
              오독오독<br/>멈출 수 없는 식감
            </div>
            <div style="font-size:16px;color:${COLORS.textBrown};line-height:1.8;margin-bottom:30px;">
              가볍고 바삭한 크런치 텍스처<br/>
              한 번 손이 가면 멈출 수 없는<br/>
              중독성 있는 식감
            </div>
            <div style="display:flex;gap:16px;">
              <div style="background:${COLORS.bgWarm};border-radius:12px;padding:16px 24px;text-align:center;">
                <div style="font-size:28px;font-weight:800;color:${COLORS.badge};">바삭</div>
                <div style="font-size:12px;color:${COLORS.textLight};margin-top:4px;">CRUNCHY</div>
              </div>
              <div style="background:${COLORS.bgWarm};border-radius:12px;padding:16px 24px;text-align:center;">
                <div style="font-size:28px;font-weight:800;color:${COLORS.badge};">오독</div>
                <div style="font-size:12px;color:${COLORS.textLight};margin-top:4px;">CRISPY</div>
              </div>
              <div style="background:${COLORS.bgWarm};border-radius:12px;padding:16px 24px;text-align:center;">
                <div style="font-size:28px;font-weight:800;color:${COLORS.badge};">담백</div>
                <div style="font-size:12px;color:${COLORS.textLight};margin-top:4px;">LIGHT</div>
              </div>
            </div>
          </div>
          <div style="flex:1;display:flex;align-items:center;justify-content:center;background:${COLORS.bgAccent};border-radius:24px;position:relative;">
            <img src="${productDataUrl}" style="width:300px;height:auto;transform:rotate(-8deg);filter:drop-shadow(0 15px 35px rgba(0,0,0,0.12));" />
            <div style="position:absolute;top:30px;left:30px;font-size:60px;font-weight:900;color:rgba(139,105,20,0.1);">오독!<br/>오독!</div>
          </div>
        </div>
      </div>
    `
  },
  // 6. POINT 3 - 가벼운 칼로리
  {
    name: '06_point_03',
    height: 950,
    html: `
      <div style="width:${WIDTH}px;height:950px;background:${COLORS.bgCream};display:flex;flex-direction:column;font-family:'Noto Sans KR',sans-serif;padding:60px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:40px;">
          <div style="font-size:14px;font-weight:700;color:${COLORS.badge};letter-spacing:4px;">POINT</div>
          <div style="font-size:48px;font-weight:900;color:${COLORS.badge};opacity:0.3;">03</div>
        </div>
        <div style="display:flex;gap:40px;flex:1;">
          <div style="flex:1;display:flex;flex-direction:column;justify-content:center;">
            <div style="font-size:36px;font-weight:800;color:${COLORS.textDark};line-height:1.4;margin-bottom:20px;">
              한 봉지<br/>215 kcal의 가벼움
            </div>
            <div style="font-size:16px;color:${COLORS.textBrown};line-height:1.8;margin-bottom:30px;">
              42g 한 봉지로 간편하게<br/>
              부담 없는 칼로리로 즐기는<br/>
              건강한 스낵 타임
            </div>
          </div>
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;">
            <div style="width:200px;height:200px;border-radius:50%;background:linear-gradient(135deg, ${COLORS.accentGreen}, ${COLORS.accent});display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 10px 40px rgba(107,142,35,0.3);">
              <div style="font-size:52px;font-weight:900;color:white;">215</div>
              <div style="font-size:16px;color:rgba(255,255,255,0.9);font-weight:600;">kcal</div>
            </div>
            <div style="display:flex;gap:20px;margin-top:10px;">
              <div style="text-align:center;background:${COLORS.bgWarm};padding:16px 24px;border-radius:12px;">
                <div style="font-size:28px;font-weight:800;color:${COLORS.textDark};">42g</div>
                <div style="font-size:12px;color:${COLORS.textLight};">1봉지</div>
              </div>
              <div style="text-align:center;background:${COLORS.bgWarm};padding:16px 24px;border-radius:12px;">
                <div style="font-size:28px;font-weight:800;color:${COLORS.textDark};">5.14%</div>
                <div style="font-size:12px;color:${COLORS.textLight};">두부 함유</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `
  },
  // 7. SIZZLE - 클로즈업
  {
    name: '07_sizzle',
    height: 800,
    html: `
      <div style="width:${WIDTH}px;height:800px;background:linear-gradient(135deg, ${COLORS.bgWarm} 0%, #E8D5BE 100%);display:flex;align-items:center;justify-content:center;font-family:'Noto Sans KR',sans-serif;position:relative;overflow:hidden;">
        <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:radial-gradient(ellipse at 60% 40%, rgba(255,255,255,0.5) 0%, transparent 60%);"></div>
        <div style="position:relative;z-index:1;text-align:center;">
          <div style="font-size:16px;color:${COLORS.textLight};letter-spacing:6px;margin-bottom:16px;">CLOSE UP</div>
          <div style="font-size:42px;font-weight:900;color:${COLORS.textDark};margin-bottom:30px;">고소함이 눈에 보이는</div>
          <img src="${productDataUrl}" style="width:500px;height:auto;filter:drop-shadow(0 30px 60px rgba(0,0,0,0.2));margin-bottom:20px;" />
          <div style="font-size:15px;color:${COLORS.textBrown};line-height:1.6;">
            콩을 갈아 반죽에 넣어 구워낸 한 장 한 장<br/>
            눈으로도 느껴지는 고소한 풍미
          </div>
        </div>
      </div>
    `
  },
  // 8. COMPARISON
  {
    name: '08_comparison',
    height: 900,
    html: `
      <div style="width:${WIDTH}px;height:900px;background:${COLORS.bgLight};display:flex;flex-direction:column;align-items:center;font-family:'Noto Sans KR',sans-serif;padding:60px;">
        <div style="font-size:16px;color:${COLORS.textLight};letter-spacing:4px;margin-bottom:12px;">COMPARISON</div>
        <div style="font-size:36px;font-weight:800;color:${COLORS.textDark};margin-bottom:50px;text-align:center;">일반 과자 vs 두부과자</div>
        <div style="display:flex;gap:30px;width:100%;">
          <div style="flex:1;background:#F0E8E0;border-radius:20px;padding:40px;text-align:center;position:relative;opacity:0.7;">
            <div style="font-size:14px;color:${COLORS.textLight};letter-spacing:2px;margin-bottom:20px;">GENERAL SNACK</div>
            <div style="font-size:24px;font-weight:700;color:${COLORS.textBrown};margin-bottom:30px;">일반 밀가루 과자</div>
            <div style="text-align:left;font-size:15px;color:${COLORS.textBrown};line-height:2.2;">
              <div style="display:flex;align-items:center;gap:8px;"><span style="color:#CC6666;">✗</span> 밀가루 기반</div>
              <div style="display:flex;align-items:center;gap:8px;"><span style="color:#CC6666;">✗</span> 높은 칼로리</div>
              <div style="display:flex;align-items:center;gap:8px;"><span style="color:#CC6666;">✗</span> 기름진 식감</div>
              <div style="display:flex;align-items:center;gap:8px;"><span style="color:#CC6666;">✗</span> 자극적인 맛</div>
              <div style="display:flex;align-items:center;gap:8px;"><span style="color:#CC6666;">✗</span> 영양 불균형</div>
            </div>
          </div>
          <div style="flex:1;background:${COLORS.bgWarm};border-radius:20px;padding:40px;text-align:center;border:2px solid ${COLORS.accentGreen};position:relative;">
            <div style="position:absolute;top:-14px;left:50%;transform:translateX(-50%);background:${COLORS.accentGreen};color:white;padding:4px 20px;border-radius:20px;font-size:13px;font-weight:600;">추천</div>
            <div style="font-size:14px;color:${COLORS.accentGreen};letter-spacing:2px;margin-bottom:20px;">SNACK 24</div>
            <div style="font-size:24px;font-weight:700;color:${COLORS.textDark};margin-bottom:30px;">스낵24 두부과자</div>
            <div style="text-align:left;font-size:15px;color:${COLORS.textDark};line-height:2.2;">
              <div style="display:flex;align-items:center;gap:8px;"><span style="color:${COLORS.accentGreen};font-weight:700;">✓</span> 두부 5.14% 함유</div>
              <div style="display:flex;align-items:center;gap:8px;"><span style="color:${COLORS.accentGreen};font-weight:700;">✓</span> 215kcal / 42g</div>
              <div style="display:flex;align-items:center;gap:8px;"><span style="color:${COLORS.accentGreen};font-weight:700;">✓</span> 바삭 담백한 식감</div>
              <div style="display:flex;align-items:center;gap:8px;"><span style="color:${COLORS.accentGreen};font-weight:700;">✓</span> 고소한 콩 풍미</div>
              <div style="display:flex;align-items:center;gap:8px;"><span style="color:${COLORS.accentGreen};font-weight:700;">✓</span> 대두 99% 원료</div>
            </div>
          </div>
        </div>
      </div>
    `
  },
  // 9. TRUST
  {
    name: '09_trust',
    height: 800,
    html: `
      <div style="width:${WIDTH}px;height:800px;background:${COLORS.bgCream};display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'Noto Sans KR',sans-serif;padding:60px;">
        <div style="font-size:16px;color:${COLORS.textLight};letter-spacing:4px;margin-bottom:12px;">TRUST</div>
        <div style="font-size:36px;font-weight:800;color:${COLORS.textDark};margin-bottom:16px;text-align:center;">믿을 수 있는 원재료</div>
        <div style="font-size:16px;color:${COLORS.textBrown};margin-bottom:50px;">꼼꼼하게 따져본 성분, 안심하고 드세요</div>
        <div style="display:flex;gap:24px;width:100%;max-width:740px;">
          <div style="flex:1;background:white;border-radius:16px;padding:30px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.06);">
            <div style="width:64px;height:64px;background:linear-gradient(135deg, ${COLORS.accentGreen}, #8BAF5A);border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;font-size:28px;">🫘</div>
            <div style="font-size:18px;font-weight:700;color:${COLORS.textDark};margin-bottom:8px;">대두 99%</div>
            <div style="font-size:13px;color:${COLORS.textLight};line-height:1.6;">엄선된 대두로<br/>만든 두부 원료</div>
          </div>
          <div style="flex:1;background:white;border-radius:16px;padding:30px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.06);">
            <div style="width:64px;height:64px;background:linear-gradient(135deg, ${COLORS.badge}, #A68B3C);border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;font-size:28px;">🌾</div>
            <div style="font-size:18px;font-weight:700;color:${COLORS.textDark};margin-bottom:8px;">담백한 제조</div>
            <div style="font-size:13px;color:${COLORS.textLight};line-height:1.6;">두부를 갈아 반죽에<br/>넣어 구워낸 공법</div>
          </div>
          <div style="flex:1;background:white;border-radius:16px;padding:30px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.06);">
            <div style="width:64px;height:64px;background:linear-gradient(135deg, #7D9B4E, #5A8E23);border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;font-size:28px;">✅</div>
            <div style="font-size:18px;font-weight:700;color:${COLORS.textDark};margin-bottom:8px;">간편한 포장</div>
            <div style="font-size:13px;color:${COLORS.textLight};line-height:1.6;">42g 개별 포장으로<br/>언제 어디서나</div>
          </div>
        </div>
      </div>
    `
  },
  // 10. DIVIDER
  {
    name: '10_divider',
    height: 400,
    html: `
      <div style="width:${WIDTH}px;height:400px;background:linear-gradient(135deg, ${COLORS.bgDarkBrown} 0%, #3D3219 100%);display:flex;align-items:center;justify-content:center;font-family:'Noto Sans KR',sans-serif;position:relative;overflow:hidden;">
        <div style="position:absolute;right:-50px;top:-50px;width:300px;height:300px;border-radius:50%;background:rgba(139,105,20,0.15);"></div>
        <div style="position:absolute;left:-30px;bottom:-80px;width:200px;height:200px;border-radius:50%;background:rgba(107,142,35,0.1);"></div>
        <div style="display:flex;align-items:center;gap:50px;position:relative;z-index:1;">
          <img src="${productDataUrl}" style="width:200px;height:auto;filter:drop-shadow(0 10px 30px rgba(0,0,0,0.3));transform:rotate(-5deg);" />
          <div>
            <div style="font-size:40px;font-weight:900;color:white;line-height:1.3;">한 입 베어물면</div>
            <div style="font-size:40px;font-weight:900;color:${COLORS.divider};line-height:1.3;">멈출 수 없는 고소함</div>
            <div style="width:40px;height:2px;background:${COLORS.accent};margin-top:16px;"></div>
          </div>
        </div>
      </div>
    `
  },
  // 11. LIFESTYLE
  {
    name: '11_lifestyle',
    height: 900,
    html: `
      <div style="width:${WIDTH}px;height:900px;background:${COLORS.bgLight};display:flex;flex-direction:column;align-items:center;font-family:'Noto Sans KR',sans-serif;padding:60px;">
        <div style="font-size:16px;color:${COLORS.textLight};letter-spacing:4px;margin-bottom:12px;">LIFESTYLE</div>
        <div style="font-size:36px;font-weight:800;color:${COLORS.textDark};margin-bottom:16px;">일상 속 두부과자</div>
        <div style="font-size:16px;color:${COLORS.textBrown};margin-bottom:50px;">하루 중 언제든, 가볍게 즐기는 건강 간식</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;width:100%;">
          <div style="background:${COLORS.bgWarm};border-radius:20px;padding:40px;display:flex;flex-direction:column;align-items:center;text-align:center;">
            <div style="font-size:48px;margin-bottom:16px;">☕</div>
            <div style="font-size:20px;font-weight:700;color:${COLORS.textDark};margin-bottom:8px;">오후 티타임</div>
            <div style="font-size:14px;color:${COLORS.textBrown};line-height:1.6;">커피와 함께하는<br/>고소한 간식 타임</div>
          </div>
          <div style="background:${COLORS.bgWarm};border-radius:20px;padding:40px;display:flex;flex-direction:column;align-items:center;text-align:center;">
            <div style="font-size:48px;margin-bottom:16px;">🎬</div>
            <div style="font-size:20px;font-weight:700;color:${COLORS.textDark};margin-bottom:8px;">영화 감상</div>
            <div style="font-size:14px;color:${COLORS.textBrown};line-height:1.6;">영화 볼 때<br/>부담 없는 스낵</div>
          </div>
          <div style="background:${COLORS.bgWarm};border-radius:20px;padding:40px;display:flex;flex-direction:column;align-items:center;text-align:center;">
            <div style="font-size:48px;margin-bottom:16px;">💼</div>
            <div style="font-size:20px;font-weight:700;color:${COLORS.textDark};margin-bottom:8px;">사무실 간식</div>
            <div style="font-size:14px;color:${COLORS.textBrown};line-height:1.6;">출출한 오후<br/>든든한 한 봉지</div>
          </div>
          <div style="background:${COLORS.bgWarm};border-radius:20px;padding:40px;display:flex;flex-direction:column;align-items:center;text-align:center;">
            <div style="font-size:48px;margin-bottom:16px;">🚗</div>
            <div style="font-size:20px;font-weight:700;color:${COLORS.textDark};margin-bottom:8px;">나들이 간식</div>
            <div style="font-size:14px;color:${COLORS.textBrown};line-height:1.6;">여행, 피크닉에<br/>가볍게 챙기는</div>
          </div>
        </div>
      </div>
    `
  },
  // 12. SITUATION (TPO)
  {
    name: '12_situation',
    height: 700,
    html: `
      <div style="width:${WIDTH}px;height:700px;background:linear-gradient(180deg, ${COLORS.bgCream} 0%, ${COLORS.bgWarm} 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'Noto Sans KR',sans-serif;padding:60px;">
        <div style="font-size:16px;color:${COLORS.textLight};letter-spacing:4px;margin-bottom:12px;">WHEN & WHERE</div>
        <div style="font-size:36px;font-weight:800;color:${COLORS.textDark};margin-bottom:50px;">언제 어디서나 즐기는 두부과자</div>
        <div style="display:flex;gap:16px;width:100%;">
          <div style="flex:1;background:white;border-radius:16px;padding:28px 20px;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,0.05);">
            <div style="width:50px;height:50px;background:${COLORS.accentGreen};border-radius:12px;margin:0 auto 12px;display:flex;align-items:center;justify-content:center;font-size:24px;color:white;">🌅</div>
            <div style="font-size:15px;font-weight:700;color:${COLORS.textDark};margin-bottom:4px;">아침 출근길</div>
            <div style="font-size:12px;color:${COLORS.textLight};">가볍게 한 봉지</div>
          </div>
          <div style="flex:1;background:white;border-radius:16px;padding:28px 20px;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,0.05);">
            <div style="width:50px;height:50px;background:${COLORS.badge};border-radius:12px;margin:0 auto 12px;display:flex;align-items:center;justify-content:center;font-size:24px;color:white;">🏋️</div>
            <div style="font-size:15px;font-weight:700;color:${COLORS.textDark};margin-bottom:4px;">운동 후</div>
            <div style="font-size:12px;color:${COLORS.textLight};">단백질 간식</div>
          </div>
          <div style="flex:1;background:white;border-radius:16px;padding:28px 20px;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,0.05);">
            <div style="width:50px;height:50px;background:#B8860B;border-radius:12px;margin:0 auto 12px;display:flex;align-items:center;justify-content:center;font-size:24px;color:white;">🍺</div>
            <div style="font-size:15px;font-weight:700;color:${COLORS.textDark};margin-bottom:4px;">맥주 안주</div>
            <div style="font-size:12px;color:${COLORS.textLight};">고소한 안주</div>
          </div>
          <div style="flex:1;background:white;border-radius:16px;padding:28px 20px;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,0.05);">
            <div style="width:50px;height:50px;background:#7D9B4E;border-radius:12px;margin:0 auto 12px;display:flex;align-items:center;justify-content:center;font-size:24px;color:white;">🏫</div>
            <div style="font-size:15px;font-weight:700;color:${COLORS.textDark};margin-bottom:4px;">아이 간식</div>
            <div style="font-size:12px;color:${COLORS.textLight};">건강한 선택</div>
          </div>
        </div>
      </div>
    `
  },
  // 13. REVIEW
  {
    name: '13_review',
    height: 950,
    html: `
      <div style="width:${WIDTH}px;height:950px;background:${COLORS.bgLight};display:flex;flex-direction:column;align-items:center;font-family:'Noto Sans KR',sans-serif;padding:60px;">
        <div style="font-size:16px;color:${COLORS.textLight};letter-spacing:4px;margin-bottom:12px;">REAL REVIEW</div>
        <div style="font-size:36px;font-weight:800;color:${COLORS.textDark};margin-bottom:16px;">이미 경험한 분들의 후기</div>
        <div style="font-size:16px;color:${COLORS.textBrown};margin-bottom:40px;">실제 구매 고객님들의 솔직한 리뷰</div>
        <div style="display:flex;flex-direction:column;gap:20px;width:100%;max-width:700px;">
          ${[
            { stars: 5, name: '김**', text: '두부라서 걱정했는데 진짜 고소하고 바삭해요! 자꾸 손이 가서 한 봉지가 순식간에 사라집니다 ㅎㅎ', date: '2026.02.15' },
            { stars: 5, name: '박**', text: '다이어트 중인데 이 정도 칼로리면 죄책감 없이 먹을 수 있어서 좋아요. 고소한 맛이 일품!', date: '2026.02.28' },
            { stars: 4, name: '이**', text: '아이 간식으로 사줬는데 오독오독 식감을 너무 좋아해요. 건강한 간식이라 안심하고 줍니다.', date: '2026.03.05' },
          ].map(r => `
            <div style="background:white;border-radius:16px;padding:28px;box-shadow:0 2px 12px rgba(0,0,0,0.05);">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <div style="color:#FFB800;font-size:16px;">${'★'.repeat(r.stars)}${'☆'.repeat(5-r.stars)}</div>
                  <div style="font-size:14px;font-weight:600;color:${COLORS.textDark};">${r.name}</div>
                </div>
                <div style="font-size:12px;color:${COLORS.textLight};">${r.date}</div>
              </div>
              <div style="font-size:15px;color:${COLORS.textBrown};line-height:1.7;">${r.text}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `
  },
  // 14. CTA
  {
    name: '14_cta',
    height: 700,
    html: `
      <div style="width:${WIDTH}px;height:700px;background:linear-gradient(180deg, ${COLORS.bgWarm} 0%, ${COLORS.bgCream} 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'Noto Sans KR',sans-serif;position:relative;overflow:hidden;">
        <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:radial-gradient(ellipse at 50% 60%, rgba(107,142,35,0.08) 0%, transparent 60%);"></div>
        <div style="position:relative;z-index:1;text-align:center;">
          <img src="${productDataUrl}" style="width:280px;height:auto;filter:drop-shadow(0 20px 40px rgba(0,0,0,0.15));margin-bottom:30px;" />
          <div style="font-size:20px;color:${COLORS.textBrown};margin-bottom:8px;">고소하고 담백한</div>
          <div style="font-size:42px;font-weight:900;color:${COLORS.textDark};margin-bottom:24px;">스낵24 두부과자</div>
          <div style="font-size:16px;color:${COLORS.textLight};margin-bottom:30px;line-height:1.6;">
            콩을 갈아 만든 바삭한 한 조각<br/>
            지금 바로 만나보세요
          </div>
          <div style="display:inline-block;background:${COLORS.accentGreen};color:white;padding:16px 60px;border-radius:50px;font-size:18px;font-weight:700;letter-spacing:2px;box-shadow:0 6px 20px rgba(107,142,35,0.3);">
            구매하기
          </div>
        </div>
      </div>
    `
  },
  // 15. SPEC
  {
    name: '15_spec',
    height: 1000,
    html: `
      <div style="width:${WIDTH}px;height:1000px;background:${COLORS.bgLight};display:flex;flex-direction:column;align-items:center;font-family:'Noto Sans KR',sans-serif;padding:60px;">
        <div style="font-size:16px;color:${COLORS.textLight};letter-spacing:4px;margin-bottom:12px;">PRODUCT INFO</div>
        <div style="font-size:30px;font-weight:800;color:${COLORS.textDark};margin-bottom:40px;">제품 상세 정보</div>
        <div style="display:flex;gap:40px;width:100%;">
          <div style="flex:0 0 250px;display:flex;align-items:flex-start;justify-content:center;">
            <img src="${productDataUrl}" style="width:220px;height:auto;filter:drop-shadow(0 8px 20px rgba(0,0,0,0.1));" />
          </div>
          <div style="flex:1;">
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              ${[
                ['제품명', '스낵24 두부과자'],
                ['영문명', 'CRUNCHY TOFU CHIPS'],
                ['내용량', '42g'],
                ['열량', '215 kcal'],
                ['원재료', '두부 5.14% (대두 99%)'],
                ['보관방법', '직사광선을 피하고 서늘한 곳에 보관'],
                ['유통기한', '제조일로부터 6개월'],
                ['제조원', 'SNACK 24'],
              ].map(([k, v]) => `
                <tr>
                  <td style="padding:14px 16px;border-bottom:1px solid ${COLORS.divider};font-weight:600;color:${COLORS.textDark};width:120px;background:${COLORS.bgWarm};vertical-align:top;">${k}</td>
                  <td style="padding:14px 16px;border-bottom:1px solid ${COLORS.divider};color:${COLORS.textBrown};">${v}</td>
                </tr>
              `).join('')}
            </table>
            <div style="margin-top:20px;padding:16px;background:${COLORS.bgWarm};border-radius:8px;font-size:12px;color:${COLORS.textLight};line-height:1.6;">
              ※ 본 제품은 대두를 사용한 제품입니다.<br/>
              ※ 이미지는 실제와 다를 수 있습니다.<br/>
              ※ 상세 영양정보는 제품 포장을 확인해주세요.
            </div>
          </div>
        </div>
      </div>
    `
  },
];

async function generateImages() {
  console.log('🚀 Puppeteer 브라우저 시작...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    console.log(`📸 [${i + 1}/15] ${section.name} 생성 중...`);

    const page = await browser.newPage();
    await page.setViewport({ width: WIDTH, height: section.height, deviceScaleFactor: 2 });

    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { width: ${WIDTH}px; overflow: hidden; }
        </style>
      </head>
      <body>${section.html}</body>
      </html>
    `;

    await page.setContent(fullHtml, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForFunction(() => document.fonts.ready);

    const outputPath = path.join(OUTPUT_DIR, `${section.name}.png`);
    await page.screenshot({
      path: outputPath,
      clip: { x: 0, y: 0, width: WIDTH, height: section.height },
    });

    await page.close();
    console.log(`   ✅ 저장: ${outputPath}`);
  }

  await browser.close();
  console.log(`\n🎉 완료! 15개 섹션 이미지가 ${OUTPUT_DIR}에 저장되었습니다.`);
}

generateImages().catch(console.error);
