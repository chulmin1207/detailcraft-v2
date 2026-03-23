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

  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addLog = (msg: string) => setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const productImage = uploadedImages.product[0] || '';
  const referenceImage = uploadedImages.references[0] || '';

  // Track 1: Claude 기획 → Gemini 이미지
  const generateTrack1 = useCallback(async () => {
    setIsGenerating(true);
    setGenerationProgress(0);
    setGeneratedImages({});
    setError(null);
    setLogs([]);

    try {
      // 1) Claude 기획
      addLog('Claude 기획서 생성 중...');
      const prompt = buildPlanPrompt(productName, productFeatures);
      const response = await callClaudeForPlan(prompt, { useBackend, backendUrl: BACKEND_URL });
      const sections = parseSections(response);
      setGeneratedSections(sections);
      addLog(`기획 완료: ${sections.length}개 섹션`);

      // 2) Gemini 이미지 생성
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        addLog(`섹션 ${i + 1}: ${section.name} 생성 중...`);
        try {
          const result = await generateSectionImage({
            section,
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
          addLog(`섹션 ${i + 1}: 완료`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : '생성 실패';
          addLog(`섹션 ${i + 1}: 실패 - ${msg}`);
          setGeneratedImages((prev) => ({ ...prev, [i]: { data: '', prompt: '', error: msg } }));
        }
        setGenerationProgress(Math.round(((i + 1) / sections.length) * 100));
        if (i < sections.length - 1) await new Promise((r) => setTimeout(r, 2000));
      }
      addLog('전체 생성 완료!');
    } catch (err) {
      setError(err instanceof Error ? err.message : '생성 실패');
    } finally {
      setIsGenerating(false);
    }
  }, [productName, productFeatures, productImage, referenceImage, useBackend, geminiApiKey, setIsGenerating, setGenerationProgress, setGeneratedImages, setGeneratedSections]);

  // Track 2: 심플 Gemini 직행
  const generateTrack2 = useCallback(async () => {
    setIsGenerating(true);
    setGenerationProgress(0);
    setGeneratedImages({});
    setError(null);
    setLogs([]);
    addLog('심플 모드 이미지 생성 시작');

    try {
      for (let i = 0; i < FIXED_SECTIONS.length; i++) {
        const section = FIXED_SECTIONS[i];
        addLog(`섹션 ${i + 1}: ${section.label} 생성 중...`);
        try {
          const result = await generateSectionImage({
            section,
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
          addLog(`섹션 ${i + 1}: 완료`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : '생성 실패';
          addLog(`섹션 ${i + 1}: 실패 - ${msg}`);
          setGeneratedImages((prev) => ({ ...prev, [i]: { data: '', prompt: '', error: msg } }));
        }
        setGenerationProgress(Math.round(((i + 1) / FIXED_SECTIONS.length) * 100));
        if (i < FIXED_SECTIONS.length - 1) await new Promise((r) => setTimeout(r, 2000));
      }
      addLog('전체 생성 완료!');
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

  const successCount = Object.values(generatedImages).filter((img) => img.data && !img.error).length;
  const totalSections = selectedTrack === 'plan' ? generatedSections.length : FIXED_SECTIONS.length;
  const hasResults = successCount > 0;

  return (
    <section className="max-w-5xl mx-auto">
      {/* 트랙 선택 (생성 시작 전) */}
      {!isGenerating && !hasResults && (
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
        <div className="bg-bg-secondary border border-border-subtle rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-text-primary">이미지 생성 중...</h3>
            <span className="text-accent-primary font-bold">{generationProgress}%</span>
          </div>
          <div className="w-full bg-bg-tertiary rounded-full h-3 mb-4">
            <div
              className="bg-accent-primary h-3 rounded-full transition-all duration-500"
              style={{ width: `${generationProgress}%` }}
            />
          </div>
          <div className="bg-bg-primary rounded-xl p-4 max-h-48 overflow-y-auto text-xs text-text-secondary font-mono space-y-1">
            {logs.map((log, i) => (
              <div key={i}>{log}</div>
            ))}
          </div>
        </div>
      )}

      {/* 에러 */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-red-400 text-sm">
          {error}
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
