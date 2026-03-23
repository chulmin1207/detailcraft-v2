import { useState, useCallback } from 'react';
import { useProductStore } from '@/entities/product';
import { useImageStore } from '@/entities/image';
import { generateSectionImage } from '@/features/image-generation';
import { buildPlanPrompt, callClaudeForPlan, parseSections } from '@/features/plan-generation';
import { FIXED_SECTIONS } from '@/shared/config/sections';
import { MODEL_CONFIG, BACKEND_URL, PLATFORM_CONFIGS } from '@/shared/config/constants';
import type { GenerationTrack } from '@/shared/types';
import { resizeImage, base64ToBlob } from '@/features/image-generation';

export function Step2Page() {
  const { productName, productFeatures, selectedTrack, setSelectedTrack, generatedSections, setGeneratedSections } = useProductStore();
  const { uploadedImages, generatedImages, setGeneratedImages, useBackend, geminiApiKey, isGenerating, setIsGenerating, generationProgress, setGenerationProgress } = useImageStore();

  const [error, setError] = useState<string | null>(null);

  const productImage = uploadedImages.product[0] || '';
  const referenceImage = uploadedImages.references[0] || '';

  // Track 1: Claude 기획 → Gemini 이미지
  const generateTrack1 = useCallback(async () => {
    setIsGenerating(true);
    setGenerationProgress(0);
    setGeneratedImages({});
    setError(null);

    try {
      const prompt = buildPlanPrompt(productName, productFeatures);
      console.log('[Track1] Claude 호출 시작...');
      const response = await callClaudeForPlan(prompt, { useBackend, backendUrl: BACKEND_URL });
      console.log('[Track1] Claude 응답 길이:', response.length);
      const sections = parseSections(response);
      console.log('[Track1] 파싱된 섹션:', sections.length);
      if (sections.length === 0) {
        throw new Error('기획서에서 섹션을 파싱하지 못했습니다. 다시 시도해주세요.');
      }
      setGeneratedSections(sections);
      setGenerationProgress(5);

      for (let i = 0; i < sections.length; i++) {
        try {
          const result = await generateSectionImage({
            section: sections[i],
            index: i,
            totalSections: sections.length,
            modelConfig: MODEL_CONFIG,
            productImage,
            referenceImage,
            useBackend,
            backendUrl: BACKEND_URL,
            geminiApiKey,
            productName,
            productFeatures,
            track: 'plan',
          });
          setGeneratedImages((prev) => ({ ...prev, [i]: { data: result.dataUrl, prompt: result.prompt } }));
        } catch (err) {
          const msg = err instanceof Error ? err.message : '생성 실패';
          console.error(`[Track1] 섹션 ${i + 1} 이미지 생성 실패:`, msg);
          setGeneratedImages((prev) => ({ ...prev, [i]: { data: '', prompt: '', error: msg } }));
        }
        setGenerationProgress(5 + Math.round(((i + 1) / sections.length) * 95));
        if (i < sections.length - 1) await new Promise((r) => setTimeout(r, 2000));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '생성 실패');
    } finally {
      setIsGenerating(false);
    }
  }, [productName, productFeatures, productImage, referenceImage, useBackend, geminiApiKey, setIsGenerating, setGenerationProgress, setGeneratedImages, setGeneratedSections]);

  // Track 2: 심플 직행
  const generateTrack2 = useCallback(async () => {
    setIsGenerating(true);
    setGenerationProgress(0);
    setGeneratedImages({});
    setError(null);

    try {
      for (let i = 0; i < FIXED_SECTIONS.length; i++) {
        try {
          const result = await generateSectionImage({
            section: FIXED_SECTIONS[i],
            index: i,
            totalSections: FIXED_SECTIONS.length,
            modelConfig: MODEL_CONFIG,
            productImage,
            referenceImage,
            useBackend,
            backendUrl: BACKEND_URL,
            geminiApiKey,
            productName,
            productFeatures,
            track: 'simple',
          });
          setGeneratedImages((prev) => ({ ...prev, [i]: { data: result.dataUrl, prompt: result.prompt } }));
        } catch (err) {
          const msg = err instanceof Error ? err.message : '생성 실패';
          setGeneratedImages((prev) => ({ ...prev, [i]: { data: '', prompt: '', error: msg } }));
        }
        setGenerationProgress(Math.round(((i + 1) / FIXED_SECTIONS.length) * 100));
        if (i < FIXED_SECTIONS.length - 1) await new Promise((r) => setTimeout(r, 2000));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '생성 실패');
    } finally {
      setIsGenerating(false);
    }
  }, [productName, productFeatures, productImage, referenceImage, useBackend, geminiApiKey, setIsGenerating, setGenerationProgress, setGeneratedImages]);

  const handleStartGeneration = (track: GenerationTrack) => {
    setSelectedTrack(track);
    if (track === 'plan') generateTrack1();
    else generateTrack2();
  };

  // 다운로드
  const handleDownload = useCallback(async () => {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    const sections = selectedTrack === 'plan' ? generatedSections : FIXED_SECTIONS;

    for (const config of PLATFORM_CONFIGS) {
      const folder = zip.folder(config.folder)!;
      for (let i = 0; i < sections.length; i++) {
        const img = generatedImages[i];
        if (!img?.data) continue;
        const resized = await resizeImage(img.data, config.width);
        const blob = base64ToBlob(resized);
        const name = `${String(i + 1).padStart(2, '0')}_${sections[i].name}.png`;
        folder.file(name, blob);
      }
    }

    const content = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${productName}_상세페이지_${new Date().toISOString().slice(0, 10)}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }, [generatedImages, generatedSections, productName, selectedTrack]);

  const imageEntries = Object.keys(generatedImages).length;
  const successCount = Object.values(generatedImages).filter((img) => img.data && !img.error).length;
  const totalSections = selectedTrack === 'plan' ? (generatedSections.length || FIXED_SECTIONS.length) : FIXED_SECTIONS.length;
  const hasResults = imageEntries > 0 || (selectedTrack !== null && !isGenerating);

  return (
    <section className="max-w-5xl mx-auto">
      {/* 트랙 선택 (생성 시작 전) */}
      {!isGenerating && !hasResults && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <button
            onClick={() => handleStartGeneration('plan')}
            className="bg-bg-secondary border-2 border-border-subtle rounded-2xl p-8 text-left hover:border-accent-primary transition-all group"
          >
            <div className="text-2xl mb-3">{'\u{1F4CB}'}</div>
            <h3 className="text-xl font-bold text-text-primary mb-2">1안: 상세 기획</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              AI가 제품에 맞는 카피를 기획한 후<br />
              각 섹션 이미지를 생성합니다.
            </p>
            <div className="mt-4 text-xs text-text-tertiary">소요시간: 약 5-8분</div>
          </button>

          <button
            onClick={() => handleStartGeneration('simple')}
            className="bg-bg-secondary border-2 border-border-subtle rounded-2xl p-8 text-left hover:border-accent-primary transition-all group"
          >
            <div className="text-2xl mb-3">{'\u26A1'}</div>
            <h3 className="text-xl font-bold text-text-primary mb-2">2안: 심플 생성</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              레퍼런스 기반으로<br />
              바로 이미지를 생성합니다.
            </p>
            <div className="mt-4 text-xs text-text-tertiary">소요시간: 약 3-5분</div>
          </button>
        </div>
      )}

      {/* 생성 진행 상태 */}
      {isGenerating && (
        <div className="bg-bg-secondary border border-border-subtle rounded-2xl p-8 mb-6">
          <div className="text-center mb-6">
            <div className="text-4xl mb-3 animate-pulse">🎨</div>
            <h3 className="text-lg font-bold text-text-primary mb-1">상세페이지 생성 중</h3>
            <p className="text-sm text-text-tertiary">잠시만 기다려주세요</p>
          </div>
          <div className="w-full bg-bg-tertiary rounded-full h-4 mb-3">
            <div
              className="h-4 rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${generationProgress}%`,
                background: 'linear-gradient(90deg, var(--accent-primary), #a78bfa)',
              }}
            />
          </div>
          <div className="text-center text-accent-primary font-bold text-xl">{generationProgress}%</div>
        </div>
      )}

      {/* 에러 */}
      {error && !isGenerating && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 mb-6 text-center">
          <div className="text-red-400 text-sm mb-4">{error}</div>
          <button
            onClick={() => { setError(null); setSelectedTrack(null); setGeneratedImages({}); }}
            className="px-6 py-2 bg-bg-secondary border border-border-subtle rounded-xl text-sm text-text-primary hover:border-border-default"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* 결과 이미지 그리드 */}
      {hasResults && !isGenerating && (
        <>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-text-primary">
              생성된 이미지 ({successCount}/{totalSections})
            </h2>
            <div className="flex gap-3">
              <button
                onClick={() => { setGeneratedImages({}); setSelectedTrack(null); }}
                className="px-4 py-2 bg-bg-secondary border border-border-subtle rounded-xl text-sm text-text-secondary hover:border-border-default transition-colors"
              >
                다시 생성
              </button>
              <button
                onClick={handleDownload}
                className="px-6 py-2 bg-accent-primary text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
              >
                ZIP 다운로드
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: totalSections }).map((_, i) => {
              const img = generatedImages[i];
              const sections = selectedTrack === 'plan' ? generatedSections : FIXED_SECTIONS;
              const section = sections[i];
              const sectionName = section ? ('label' in section ? section.label : section.name) : `섹션 ${i + 1}`;

              return (
                <div key={i} className="bg-bg-secondary border border-border-subtle rounded-xl overflow-hidden">
                  <div className="aspect-[9/16] bg-bg-tertiary flex items-center justify-center">
                    {img?.data && !img.error ? (
                      <img src={img.data} alt={sectionName} className="w-full h-full object-cover" />
                    ) : img?.error ? (
                      <div className="text-center p-4">
                        <div className="text-red-400 text-xs">{img.error}</div>
                      </div>
                    ) : (
                      <div className="text-text-tertiary text-sm">대기중</div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="text-xs text-text-secondary truncate">{i + 1}. {sectionName}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
