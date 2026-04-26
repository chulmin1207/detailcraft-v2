import { useMemo } from 'react';
import {
  ArrowDown,
  Check,
  ChevronRight,
  Clock,
  Coffee,
  Flame,
  Heart,
  Info,
  PackageCheck,
  Quote,
  Salad,
  ShoppingBag,
  Sparkles,
  Star,
  Wheat,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useProductStore } from '@/entities/product';
import { useImageStore } from '@/entities/image';

type DetailSection = {
  number: number;
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  icon: LucideIcon;
  accent: string;
  background: string;
  textTone: 'dark' | 'light';
  points: string[];
  visual: 'hero' | 'empathy' | 'point' | 'sizzle' | 'trust' | 'divider' | 'lifestyle' | 'situation' | 'review' | 'cta' | 'spec';
};

const DEFAULT_PRODUCT_NAME = '통밀베이글칩 스윗어니언맛';
const DEFAULT_FEATURES = '양파뿌리시즈닝 9.22%, 통밀가루 6.97%, 양파분태 3.49%, 양파분말 2.3%, 40g, 192kcal';

const specRows = [
  ['제품명', '통밀베이글칩 스윗어니언맛'],
  ['내용량', '40g'],
  ['열량', '192kcal'],
  ['전면 표기', '양파뿌리시즈닝 9.22%, 통밀가루 6.97%'],
  ['양파 원료', '양파분태 3.49%, 양파분말 2.3%'],
  ['보관', '직사광선을 피해 서늘한 곳에 보관'],
] as const;

function splitFeatures(features: string) {
  return features
    .split(/[,/\n|]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5);
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function SectionBadge({ section }: { section: DetailSection }) {
  const Icon = section.icon;

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/75 px-3 py-1.5 text-[12px] font-bold text-[#244013] backdrop-blur">
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      <span>{String(section.number).padStart(2, '0')}</span>
      <span>{section.eyebrow}</span>
    </div>
  );
}

function ProductPack({ image, size = 'large' }: { image?: string; size?: 'large' | 'small' }) {
  const isSmall = size === 'small';
  const dimensions = isSmall ? 'h-[180px]' : 'h-[370px] sm:h-[460px]';

  if (image) {
    return (
      <div className={`relative flex ${dimensions} w-full items-center justify-center`}>
        <img
          src={image}
          alt="제품 패키지"
          className="max-h-full max-w-full object-contain drop-shadow-[0_34px_44px_rgba(68,46,16,0.25)]"
        />
      </div>
    );
  }

  if (isSmall) {
    return (
      <div className="relative mx-auto h-[180px] w-[132px]">
        <div className="absolute inset-0 rounded-[22px] border border-[#d5ccb7] bg-[#fbf4dc] shadow-[0_18px_30px_rgba(73,55,22,0.16)]" />
        <div className="absolute inset-x-4 top-5 h-2 rounded-full bg-white/55" />
        <div className="absolute left-1/2 top-[14%] -translate-x-1/2 text-[8px] font-black text-[#ffd781]">snack24</div>
        <div className="absolute inset-x-3 top-[24%] text-center">
          <p className="text-[10px] font-black leading-none text-[#63b52d]">Wholewheat</p>
          <p className="mt-1 text-[18px] font-black leading-none text-[#63b52d]">BagelChips!</p>
        </div>
        <div className="absolute left-1/2 top-[52%] -translate-x-1/2 -translate-y-1/2 scale-[0.46]">
          <BagelRing />
        </div>
        <div className="absolute inset-x-2 bottom-[12%] text-center">
          <p className="text-[14px] font-black leading-tight text-[#63b52d]">스윗어니언맛</p>
          <p className="mt-1 text-[8px] font-bold text-[#63b52d]">40g | 192kcal</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative mx-auto ${dimensions} w-[72%] max-w-[350px] min-w-[210px]`}>
      <div className="absolute inset-0 rounded-[34px] border border-[#d5ccb7] bg-[#fbf4dc] shadow-[0_38px_60px_rgba(73,55,22,0.18)]" />
      <div className="absolute inset-x-4 top-5 h-3 rounded-full bg-white/45" />
      <div className={`absolute left-1/2 top-[10%] -translate-x-1/2 font-black text-[#ffd781] ${isSmall ? 'text-[8px]' : 'text-[15px]'}`}>snack24</div>
      <div className={`absolute text-center ${isSmall ? 'inset-x-3 top-[20%]' : 'inset-x-7 top-[18%]'}`}>
        <p className={`font-black leading-none text-[#63b52d] ${isSmall ? 'text-[10px]' : 'text-[24px] sm:text-[32px]'}`}>Wholewheat</p>
        <p className={`mt-1 font-black leading-none text-[#63b52d] ${isSmall ? 'text-[18px]' : 'text-[42px] sm:text-[54px]'}`}>BagelChips!</p>
      </div>
      <div className={`absolute left-1/2 flex -translate-x-1/2 flex-col items-center ${isSmall ? 'top-[40%] scale-[0.48]' : 'top-[38%] scale-[0.84]'}`}>
        <BagelRing className="z-[3] rotate-[-10deg]" />
        <BagelRing className="z-[2] -mt-9 rotate-[8deg]" />
        <BagelRing className="z-[1] -mt-9 rotate-[-3deg]" />
      </div>
      {!isSmall && (
        <>
          <div className="absolute left-[16%] top-[48%] rotate-[5deg] bg-[#62b829] px-4 py-2 text-center text-[17px] font-black leading-tight text-white shadow-lg">
            통밀함유로<br />고소하게
          </div>
          <div className="absolute right-[10%] top-[61%] -rotate-[9deg] bg-[#62b829] px-4 py-2 text-[19px] font-black leading-tight text-white shadow-lg">
            SWEET<br />ONION
          </div>
        </>
      )}
      <div className={`absolute text-center ${isSmall ? 'inset-x-2 bottom-[9%]' : 'inset-x-6 bottom-[12%]'}`}>
        <p className={`font-black leading-tight text-[#63b52d] ${isSmall ? 'text-[15px]' : 'text-[27px] sm:text-[36px]'}`}>스윗어니언맛</p>
        <p className={`mt-2 font-bold text-[#63b52d] ${isSmall ? 'text-[8px]' : 'text-[13px]'}`}>40g | 192kcal</p>
      </div>
    </div>
  );
}

function BagelRing({ className = '' }: { className?: string }) {
  return (
    <div
      className={[
        'relative h-[96px] w-[152px] rounded-[50%] bg-[radial-gradient(circle_at_36%_28%,#fff4bf_0_6%,#f8bb4d_21%,#d5791e_58%,#a94d10_100%)] shadow-[0_16px_26px_rgba(132,73,12,0.28)]',
        className,
      ].join(' ')}
    >
      <div className="absolute left-1/2 top-1/2 h-[37px] w-[61px] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-[#fbf4dc] shadow-[inset_0_8px_18px_rgba(90,48,13,0.18)]" />
      <div className="absolute left-7 top-4 h-3 w-11 rounded-full bg-white/45 blur-[1px]" />
    </div>
  );
}

function OnionMotif() {
  return (
    <div className="relative h-44 w-44 rounded-full bg-[#cce6b8]">
      <div className="absolute inset-5 rounded-full border-[7px] border-white/80" />
      <div className="absolute inset-10 rounded-full border-[7px] border-white/80" />
      <div className="absolute inset-[62px] rounded-full border-[7px] border-white/80" />
    </div>
  );
}

function ProductCluster({ productImage }: { productImage?: string }) {
  return (
    <div className="relative min-h-[460px] overflow-hidden rounded-[8px] bg-[#f8edcd]">
      <div className="absolute -left-10 top-8 opacity-70">
        <OnionMotif />
      </div>
      <div className="absolute -right-6 bottom-10 opacity-80">
        <OnionMotif />
      </div>
      <div className="absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(180deg,rgba(248,237,205,0),rgba(101,76,28,0.16))]" />
      <div className="absolute inset-0 flex items-center justify-center px-8">
        <ProductPack image={productImage} />
      </div>
    </div>
  );
}

function SizzleVisual() {
  return (
    <div className="relative min-h-[430px] overflow-hidden rounded-[8px] bg-[#22170d] p-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(255,210,111,0.18),transparent_42%)]" />
      <div className="relative mx-auto grid max-w-[430px] grid-cols-2 gap-5 pt-6">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="aspect-[1.35/1] rounded-[50%] bg-[radial-gradient(circle_at_34%_24%,#fff0b7_0_8%,#efae3a_31%,#be6918_72%,#7c3309_100%)] shadow-[0_22px_30px_rgba(0,0,0,0.3)]"
            style={{ transform: `rotate(${index % 2 === 0 ? -9 : 8}deg) translateY(${index % 3 === 0 ? 12 : 0}px)` }}
          >
            <div className="mx-auto mt-[21%] h-[32%] w-[38%] rounded-[50%] bg-[#22170d] opacity-75" />
          </div>
        ))}
      </div>
      <div className="absolute bottom-6 left-6 rounded-full bg-white px-4 py-2 text-sm font-black text-[#5c3510]">CRUNCH TEXTURE</div>
    </div>
  );
}

function LifestyleVisual({ productImage }: { productImage?: string }) {
  const scenes = [
    ['오피스 데스크', Coffee],
    ['홈카페 타임', Heart],
    ['가벼운 외출', ShoppingBag],
  ] as const;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {scenes.map(([label, Icon], index) => (
        <div key={label} className="min-h-[280px] rounded-[8px] bg-white p-4 shadow-[0_18px_34px_rgba(54,42,18,0.11)]">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-black text-[#31511c]">{label}</span>
            <Icon className="h-5 w-5 text-[#65b82e]" aria-hidden="true" />
          </div>
          <div className="flex h-[210px] items-center justify-center rounded-[8px] bg-[#f6efd9]">
            {index === 1 ? (
              <div className="relative h-36 w-36 rounded-full bg-[#26421d] shadow-inner">
                <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f5ead0]" />
                <BagelRing className="absolute left-1/2 top-1/2 scale-[0.48] -translate-x-1/2 -translate-y-1/2" />
              </div>
            ) : (
              <ProductPack image={productImage} size="small" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function SituationVisual() {
  const items = [
    ['그냥 바삭하게', '한 입 크런치'],
    ['딥소스와 함께', '양파 풍미 더하기'],
    ['샐러드 토핑', '고소한 식감 포인트'],
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {items.map(([title, sub], index) => (
        <div key={title} className="rounded-[8px] bg-[#fffaf0] p-5 text-center shadow-[0_18px_34px_rgba(54,42,18,0.1)]">
          <div className="mx-auto mb-4 flex h-32 w-32 items-center justify-center rounded-full bg-[#e7f0d6]">
            {index === 2 ? <Salad className="h-16 w-16 text-[#5da630]" aria-hidden="true" /> : <BagelRing className="scale-[0.62]" />}
          </div>
          <p className="text-lg font-black text-[#244013]">{title}</p>
          <p className="mt-1 text-sm font-semibold text-[#6d765c]">{sub}</p>
        </div>
      ))}
    </div>
  );
}

function ReviewVisual() {
  const reviews = [
    ['달큰한 양파향', '첫맛은 부드럽고 끝맛은 고소해요'],
    ['얇은 바삭함', '베이글칩 특유의 크런치가 살아있어요'],
    ['가벼운 한 봉', '책상 위에 두고 먹기 좋은 사이즈예요'],
  ];

  return (
    <div className="grid gap-3">
      {reviews.map(([title, body], index) => (
        <div key={title} className="flex gap-4 rounded-[8px] bg-white p-5 shadow-[0_18px_34px_rgba(54,42,18,0.1)]">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#65b82e] text-white">
            <Quote className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <div className="mb-1 flex gap-0.5 text-[#f3a51d]">
              {Array.from({ length: 5 }).map((_, starIndex) => (
                <Star key={`${index}-${starIndex}`} className="h-4 w-4 fill-current" aria-hidden="true" />
              ))}
            </div>
            <p className="font-black text-[#244013]">{title}</p>
            <p className="text-sm font-semibold text-[#68745a]">{body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function SpecVisual({ productName }: { productName: string }) {
  const rows = specRows.map(([label, value]) => [label, label === '제품명' ? productName : value] as const);

  return (
    <div className="overflow-hidden rounded-[8px] border border-[#dfe8cf] bg-white">
      {rows.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[120px_1fr] border-b border-[#edf2e3] last:border-b-0">
          <div className="bg-[#f4f8ec] px-4 py-4 text-sm font-black text-[#31511c]">{label}</div>
          <div className="px-4 py-4 text-sm font-semibold text-[#3d442f]">{value}</div>
        </div>
      ))}
    </div>
  );
}

function SectionVisual({ section, productImage, productName, featurePills }: {
  section: DetailSection;
  productImage?: string;
  productName: string;
  featurePills: string[];
}) {
  if (section.visual === 'hero') {
    return <ProductCluster productImage={productImage} />;
  }

  if (section.visual === 'sizzle') {
    return <SizzleVisual />;
  }

  if (section.visual === 'lifestyle') {
    return <LifestyleVisual productImage={productImage} />;
  }

  if (section.visual === 'situation') {
    return <SituationVisual />;
  }

  if (section.visual === 'review') {
    return <ReviewVisual />;
  }

  if (section.visual === 'spec') {
    return <SpecVisual productName={productName} />;
  }

  if (section.visual === 'divider') {
    return (
      <div className="grid min-h-[270px] place-items-center rounded-[8px] bg-[#31511c] px-8 text-center text-white">
        <div>
          <Sparkles className="mx-auto mb-4 h-10 w-10 text-[#f8d77b]" aria-hidden="true" />
          <p className="text-4xl font-black leading-tight sm:text-5xl">OPEN, CRUNCH, REPEAT</p>
          <p className="mt-4 text-base font-semibold text-white/75">오늘 간식 루틴을 가볍게 바꾸는 한 봉</p>
        </div>
      </div>
    );
  }

  if (section.visual === 'cta') {
    return (
      <div className="relative min-h-[390px] overflow-hidden rounded-[8px] bg-[#fbeac1] p-8">
        <div className="absolute -right-16 -top-12 h-56 w-56 rounded-full bg-[#65b82e]/25" />
        <div className="absolute -bottom-20 left-10 h-64 w-64 rounded-full bg-[#efad34]/30" />
        <div className="relative grid items-center gap-6 sm:grid-cols-[1fr_1.15fr]">
          <ProductPack image={productImage} />
          <div>
            <p className="text-sm font-black text-[#65b82e]">SNACK24 PICK</p>
            <p className="mt-3 text-4xl font-black leading-tight text-[#244013]">스윗어니언 바삭함을<br />장바구니에 담기</p>
            <button
              type="button"
              onClick={() => scrollToSection('detail-section-13')}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#244013] px-6 py-3 text-sm font-black text-white transition-transform hover:scale-[1.02]"
            >
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              제품 정보 확인
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[8px] bg-white p-6 shadow-[0_18px_34px_rgba(54,42,18,0.1)]">
      <div className="mb-5 flex flex-wrap gap-2">
        {featurePills.map((feature) => (
          <span key={feature} className="rounded-full bg-[#eef7df] px-3 py-1.5 text-xs font-black text-[#477421]">
            {feature}
          </span>
        ))}
      </div>
      <div className="grid items-center gap-6 sm:grid-cols-[0.9fr_1.1fr]">
        <ProductPack image={productImage} size="small" />
        <div className="space-y-3">
          {section.points.map((point) => (
            <div key={point} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#65b82e] text-white">
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <span className="text-base font-bold text-[#354422]">{point}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DetailPanel({ section, productImage, productName, featurePills }: {
  section: DetailSection;
  productImage?: string;
  productName: string;
  featurePills: string[];
}) {
  const isDark = section.textTone === 'light';

  return (
    <section
      id={section.id}
      className={`scroll-mt-24 overflow-hidden ${section.background} px-5 py-14 sm:px-10 sm:py-16`}
      style={{ wordBreak: 'keep-all' }}
    >
      <div className="mx-auto max-w-[820px]">
        <div className="mb-8">
          <SectionBadge section={section} />
          <h2 className={`mt-5 text-[34px] font-black leading-[1.14] sm:text-[48px] ${isDark ? 'text-white' : 'text-[#203712]'}`}>
            {section.title}
          </h2>
          <p className={`mt-4 max-w-[620px] text-base font-semibold leading-7 sm:text-lg ${isDark ? 'text-white/75' : 'text-[#5f694f]'}`}>
            {section.body}
          </p>
        </div>

        <SectionVisual section={section} productImage={productImage} productName={productName} featurePills={featurePills} />
      </div>
    </section>
  );
}

export function DetailPreviewPage() {
  const { productName: rawProductName, productFeatures: rawFeatures, goToStep } = useProductStore();
  const { uploadedImages } = useImageStore();

  const productName = rawProductName.trim() || DEFAULT_PRODUCT_NAME;
  const productFeatures = rawFeatures.trim() || DEFAULT_FEATURES;
  const productImage = uploadedImages.product[0];
  const featurePills = useMemo(() => {
    const parsed = splitFeatures(productFeatures);
    return parsed.length > 0 ? parsed : splitFeatures(DEFAULT_FEATURES);
  }, [productFeatures]);

  const sections = useMemo<DetailSection[]>(() => [
    {
      number: 1,
      id: 'detail-section-1',
      eyebrow: 'Hero',
      title: '바삭하게 즐기는 통밀 베이글칩',
      body: '달콤한 양파 풍미와 고소한 통밀의 결을 한 봉에 담은 스윗어니언 스낵입니다.',
      icon: Sparkles,
      accent: '#65B82E',
      background: 'bg-[#fbf4dc]',
      textTone: 'dark',
      points: ['통밀가루 함유', '스윗어니언 풍미', '40g 한 봉'],
      visual: 'hero',
    },
    {
      number: 2,
      id: 'detail-section-2',
      eyebrow: 'Empathy',
      title: '입은 심심한데 과한 간식은 부담될 때',
      body: '가볍게 집어 먹기 좋은 크기와 바삭한 식감으로 책상 위, 가방 속, 홈카페 옆에 잘 어울립니다.',
      icon: Heart,
      accent: '#F3A51D',
      background: 'bg-[#fffaf0]',
      textTone: 'dark',
      points: ['작게 나눠 먹기 좋은 스낵', '커피나 음료 옆에 어울리는 맛', '봉지 그대로 간편하게'],
      visual: 'empathy',
    },
    {
      number: 3,
      id: 'detail-section-3',
      eyebrow: 'Point 01',
      title: '통밀 함유로 더 고소한 한 입',
      body: '패키지 전면에 표기된 통밀가루 포인트를 중심으로, 베이글칩다운 고소함을 선명하게 전달합니다.',
      icon: Wheat,
      accent: '#65B82E',
      background: 'bg-[#eef7df]',
      textTone: 'dark',
      points: ['통밀가루 6.97% 전면 표기', '담백한 곡물 풍미', '가벼운 크런치 식감'],
      visual: 'point',
    },
    {
      number: 4,
      id: 'detail-section-4',
      eyebrow: 'Point 02',
      title: '달콤짭짤한 스윗어니언 밸런스',
      body: '양파뿌리시즈닝과 양파 원료 표기를 기반으로, 스윗어니언맛의 감칠맛을 직관적으로 보여줍니다.',
      icon: Zap,
      accent: '#7DBB48',
      background: 'bg-[#f8edcd]',
      textTone: 'dark',
      points: ['양파뿌리시즈닝 9.22%', '양파분태와 양파분말 표기', '질리지 않는 감칠맛'],
      visual: 'point',
    },
    {
      number: 5,
      id: 'detail-section-5',
      eyebrow: 'Point 03',
      title: '한 봉 40g, 가볍게 챙기는 사이즈',
      body: '부담 없이 꺼내 먹기 좋은 용량과 패키지 전면 열량 정보를 깔끔하게 정리합니다.',
      icon: Clock,
      accent: '#F3A51D',
      background: 'bg-[#fffaf0]',
      textTone: 'dark',
      points: ['40g 소포장', '192kcal 전면 표기', '휴대하기 좋은 파우치'],
      visual: 'point',
    },
    {
      number: 6,
      id: 'detail-section-6',
      eyebrow: 'Sizzle Cut',
      title: '얇게 구운 링의 바삭한 결',
      body: '베이글칩의 표면 굴곡, 구움색, 깨지는 식감을 크게 보여주는 식욕 자극 섹션입니다.',
      icon: Flame,
      accent: '#EFAE34',
      background: 'bg-[#26190d]',
      textTone: 'light',
      points: ['선명한 구움색', '겹겹이 쌓이는 크런치', '입 안에서 경쾌한 식감'],
      visual: 'sizzle',
    },
    {
      number: 7,
      id: 'detail-section-7',
      eyebrow: 'Trust',
      title: '전면 표기로 확인하는 원재료 포인트',
      body: '보이는 정보만 정직하게 정리해 구매 전 확인해야 할 핵심 원료와 용량을 분명하게 보여줍니다.',
      icon: PackageCheck,
      accent: '#65B82E',
      background: 'bg-[#eef7df]',
      textTone: 'dark',
      points: ['통밀가루 6.97%', '양파뿌리시즈닝 9.22%', '양파분태 3.49%'],
      visual: 'trust',
    },
    {
      number: 8,
      id: 'detail-section-8',
      eyebrow: 'Divider',
      title: '열고, 집고, 다시 바삭하게',
      body: '상세 정보에서 라이프스타일 장면으로 넘어가는 리듬감 있는 전환 배너입니다.',
      icon: Sparkles,
      accent: '#F8D77B',
      background: 'bg-[#fbf4dc]',
      textTone: 'dark',
      points: ['간결한 메시지', '브랜드 컬러 전환', '스크롤 리듬 강화'],
      visual: 'divider',
    },
    {
      number: 9,
      id: 'detail-section-9',
      eyebrow: 'Lifestyle',
      title: '일상 어디에 둬도 어울리는 스낵',
      body: '책상 위 간식, 홈카페 플레이트, 가벼운 외출 간식까지 자연스러운 사용 장면을 보여줍니다.',
      icon: Coffee,
      accent: '#65B82E',
      background: 'bg-[#fffaf0]',
      textTone: 'dark',
      points: ['업무 중 한 입', '커피와 함께', '외출 전 가볍게'],
      visual: 'lifestyle',
    },
    {
      number: 10,
      id: 'detail-section-10',
      eyebrow: 'TPO',
      title: '그냥 먹어도, 곁들여도 좋은 바삭함',
      body: '단독 스낵부터 딥소스, 샐러드 토핑까지 스윗어니언 풍미를 즐기는 방법을 제안합니다.',
      icon: Salad,
      accent: '#65B82E',
      background: 'bg-[#eef7df]',
      textTone: 'dark',
      points: ['단독 크런치', '딥소스 페어링', '샐러드 토핑'],
      visual: 'situation',
    },
    {
      number: 11,
      id: 'detail-section-11',
      eyebrow: 'Review',
      title: '구매 전 기대되는 세 가지 포인트',
      body: '실제 후기처럼 오해되지 않도록 제품 경험을 예상 포인트 중심의 리뷰형 메시지로 구성했습니다.',
      icon: Quote,
      accent: '#F3A51D',
      background: 'bg-[#fffaf0]',
      textTone: 'dark',
      points: ['양파향', '바삭함', '휴대성'],
      visual: 'review',
    },
    {
      number: 12,
      id: 'detail-section-12',
      eyebrow: 'CTA',
      title: '스윗어니언 바삭함을 지금 담아두세요',
      body: '상세페이지의 마지막 구매 유도 구간으로 제품 이미지, 핵심 맛, 제품 정보 이동 버튼을 함께 배치합니다.',
      icon: ShoppingBag,
      accent: '#65B82E',
      background: 'bg-[#fbf4dc]',
      textTone: 'dark',
      points: ['제품 정보 확인', '장바구니 유도', '마지막 인상 강화'],
      visual: 'cta',
    },
    {
      number: 13,
      id: 'detail-section-13',
      eyebrow: 'Spec',
      title: '제품 정보 한눈에 보기',
      body: '패키지 전면에서 확인되는 주요 정보를 중심으로 구매 전 체크해야 할 내용을 정리했습니다.',
      icon: Info,
      accent: '#65B82E',
      background: 'bg-[#f8edcd]',
      textTone: 'dark',
      points: ['내용량', '열량', '원료 표기'],
      visual: 'spec',
    },
  ], []);

  return (
    <section className="mx-auto max-w-[980px]">
      <div className="mb-6 flex flex-col gap-4 rounded-[8px] border border-border-subtle bg-bg-secondary p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-accent-primary">Korean ecommerce detail page</p>
          <h1 className="mt-1 text-2xl font-black text-text-primary">13장 상세페이지 프리뷰</h1>
          <p className="mt-1 text-sm text-text-tertiary">히어로 섹션부터 제품 정보까지 한 장씩 이어지는 구성입니다.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => goToStep(1)}
            className="inline-flex items-center gap-2 rounded-full border border-border-subtle px-4 py-2 text-sm font-bold text-text-secondary hover:border-border-default"
          >
            제품 이미지 교체
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('detail-section-1')}
            className="inline-flex items-center gap-2 rounded-full bg-accent-primary px-4 py-2 text-sm font-bold text-white hover:opacity-90"
          >
            <ArrowDown className="h-4 w-4" aria-hidden="true" />
            히어로부터 보기
          </button>
        </div>
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => scrollToSection(section.id)}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border-subtle bg-bg-secondary px-3 py-1.5 text-xs font-bold text-text-secondary hover:border-accent-primary hover:text-text-primary"
          >
            {String(section.number).padStart(2, '0')}
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
          </button>
        ))}
      </div>

      <article className="overflow-hidden rounded-[8px] bg-white shadow-[0_30px_80px_rgba(0,0,0,0.28)]">
        {sections.map((section) => (
          <DetailPanel
            key={section.id}
            section={section}
            productImage={productImage}
            productName={productName}
            featurePills={featurePills}
          />
        ))}
      </article>
    </section>
  );
}
