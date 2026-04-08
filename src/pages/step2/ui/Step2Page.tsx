import { useState, useCallback } from 'react';
import { useProductStore } from '@/entities/product';
import { useImageStore } from '@/entities/image';
import { generateSectionImage, editSectionImage, compressImageForAPI } from '@/features/image-generation';
import { buildPlanPrompt, callClaudeForPlan, parseSections, parseProductJson } from '@/features/plan-generation';
import { FIXED_SECTIONS } from '@/shared/config/sections';
import { MODEL_CONFIG, BACKEND_URL, PLATFORM_CONFIGS } from '@/shared/config/constants';
import type { GenerationTrack, ProductInfoJson, Section } from '@/shared/types';
import { resizeImage, base64ToBlob } from '@/features/image-generation';

type Phase = 'select' | 'plan' | 'config' | 'generating' | 'results';

const ASPECT_RATIO_OPTIONS = ['1:1', '1:4', '1:8', '3:2', '3:4'] as const;

export function Step2Page() {
  const { productName, productFeatures, selectedTrack, setSelectedTrack, generatedSections, setGeneratedSections } = useProductStore();
  const { uploadedImages, generatedImages, setGeneratedImages, useBackend, geminiApiKey, isGenerating, setIsGenerating, generationProgress, setGenerationProgress, aspectRatio, setAspectRatio } = useImageStore();

  const [error, setError] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // New phase-based state
  const [phase, setPhase] = useState<Phase>('select');
  const [sectionRefs, setSectionRefs] = useState<Record<number, string>>({});
  const [productInfoJson, setProductInfoJson] = useState<ProductInfoJson | null>(null);

  const productImage = uploadedImages.product[0] || '';
  const referenceImages = uploadedImages.references || [];
  const toneReferenceImages = uploadedImages.toneReferences || [];

  // Phase 1: Claude plan generation only (no images)
  const generatePlan = useCallback(async () => {
    setPhase('plan');
    setError(null);

    try {
      const prompt = buildPlanPrompt(productName, productFeatures);
      console.log('[Phase1] Compressing images for Claude...');
      const compressedProduct = productImage ? await compressImageForAPI(productImage, 800, 0.6) : '';
      const compressedRefs = await Promise.all(referenceImages.filter(Boolean).map(r => compressImageForAPI(r, 600, 0.5)));
      const compressedToneRefs = await Promise.all(toneReferenceImages.filter(Boolean).map(r => compressImageForAPI(r, 600, 0.5)));
      console.log('[Phase1] Claude plan generation starting...');
      const response = await callClaudeForPlan(
        prompt,
        { useBackend, backendUrl: BACKEND_URL },
        { productImage: compressedProduct, referenceImages: compressedRefs, toneReferenceImages: compressedToneRefs }
      );
      console.log('[Phase1] Claude response length:', response.length);

      const parsedProductInfo: ProductInfoJson | null = parseProductJson(response);
      console.log('[Phase1] Product JSON:', parsedProductInfo ? 'parsed OK' : 'parse failed');
      setProductInfoJson(parsedProductInfo);

      const sections = parseSections(response);
      console.log('[Phase1] Parsed sections:', sections.length, '/ with JSON:', sections.filter(s => s.promptJson).length);
      if (sections.length === 0) {
        throw new Error('기획서에서 섹션을 파싱하지 못했습니다. 다시 시도해주세요.');
      }
      setGeneratedSections(sections);
      setSectionRefs({});
      setPhase('config');
    } catch (err) {
      setError(err instanceof Error ? err.message : '기획 생성 실패');
      setPhase('select');
    }
  }, [productName, productFeatures, productImage, referenceImages, toneReferenceImages, useBackend, setGeneratedSections]);

  // Track selection handler
  const handleTrackSelect = (track: GenerationTrack) => {
    setSelectedTrack(track);
    if (track === 'plan') {
      generatePlan();
    } else {
      // Track 2: Use FIXED_SECTIONS directly, skip to config phase
      setGeneratedSections(FIXED_SECTIONS as unknown as Section[]);
      setSectionRefs({});
      setProductInfoJson(null);
      setPhase('config');
    }
  };

  // Phase 3: Generate images for all sections
  const generateImages = useCallback(async () => {
    setPhase('generating');
    setIsGenerating(true);
    setGenerationProgress(0);
    setGeneratedImages({});
    setError(null);

    const sections = (selectedTrack === 'plan' && generatedSections.length > 0)
      ? generatedSections
      : FIXED_SECTIONS;
    const track = (selectedTrack === 'plan' && generatedSections.length > 0) ? 'plan' as const : 'simple' as const;

    try {
      for (let i = 0; i < sections.length; i++) {
        try {
          // Use section-specific reference if uploaded, otherwise global references
          const sectionSpecificRef = sectionRefs[i];
          const effectiveReferenceImages = sectionSpecificRef ? [sectionSpecificRef] : referenceImages;

          console.log(`[Gemini Prompt] Section ${i + 1}: ref=${sectionSpecificRef ? 'section-specific' : 'global'}, aspectRatio=${aspectRatio}`);

          const result = await generateSectionImage({
            section: sections[i],
            index: i,
            totalSections: sections.length,
            modelConfig: MODEL_CONFIG,
            productImage,
            referenceImages: effectiveReferenceImages,
            toneReferenceImages,
            useBackend,
            backendUrl: BACKEND_URL,
            geminiApiKey,
            productName,
            productFeatures,
            track,
            aspectRatio,
            productInfoJson: productInfoJson || undefined,
          });
          setGeneratedImages((prev) => ({ ...prev, [i]: { data: result.dataUrl, prompt: result.prompt } }));
        } catch (err) {
          const msg = err instanceof Error ? err.message : '생성 실패';
          console.error(`[Phase3] Section ${i + 1} image generation failed:`, msg);
          setGeneratedImages((prev) => ({ ...prev, [i]: { data: '', prompt: '', error: msg } }));
        }
        setGenerationProgress(Math.round(((i + 1) / sections.length) * 100));
        if (i < sections.length - 1) await new Promise((r) => setTimeout(r, 2000));
      }
      setPhase('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : '생성 실패');
      setPhase('config');
    } finally {
      setIsGenerating(false);
    }
  }, [selectedTrack, generatedSections, sectionRefs, referenceImages, toneReferenceImages, productImage, useBackend, geminiApiKey, aspectRatio, productName, productFeatures, productInfoJson, setIsGenerating, setGenerationProgress, setGeneratedImages]);

  // Retry image generation (keeps plan, goes back to generating)
  const retryImageGeneration = useCallback(async () => {
    await generateImages();
  }, [generateImages]);

  // Edit individual image
  const handleEditImage = useCallback(async () => {
    if (editingIndex === null || !editPrompt.trim()) return;
    const originalImage = generatedImages[editingIndex]?.data;
    if (!originalImage) return;

    setIsEditing(true);
    setError(null);
    try {
      console.log('[Edit] Image edit starting:', editPrompt);
      const result = await editSectionImage({
        originalImage,
        editInstruction: editPrompt,
        modelConfig: MODEL_CONFIG,
        useBackend,
        backendUrl: BACKEND_URL,
        geminiApiKey,
      });
      console.log('[Edit] Edit complete, replacing image');
      setGeneratedImages((prev) => ({
        ...prev,
        [editingIndex]: { data: result.dataUrl, prompt: editPrompt },
      }));
      setEditingIndex(null);
      setEditPrompt('');
    } catch (err) {
      console.error('[Edit] Edit failed:', err);
      setError(err instanceof Error ? err.message : '수정 실패');
    } finally {
      setIsEditing(false);
    }
  }, [editingIndex, editPrompt, generatedImages, useBackend, geminiApiKey, setGeneratedImages]);

  // Download
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

  // Reset to start
  const resetToStart = () => {
    setPhase('select');
    setGeneratedImages({});
    setSelectedTrack(null);
    setError(null);
    setSectionRefs({});
    setProductInfoJson(null);
  };

  const sections = selectedTrack === 'plan' ? generatedSections : FIXED_SECTIONS;
  const imageEntries = Object.keys(generatedImages).length;
  const successCount = Object.values(generatedImages).filter((img) => img.data && !img.error).length;
  const totalSections = sections.length || FIXED_SECTIONS.length;

  return (
    <section className="max-w-5xl mx-auto">
      {/* ===== Phase: Track Selection ===== */}
      {phase === 'select' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <button
            onClick={() => handleTrackSelect('plan')}
            className="bg-bg-secondary border-2 border-border-subtle rounded-2xl p-8 text-left hover:border-accent-primary transition-all group"
          >
            <div className="text-2xl mb-3">{'\u{1F4CB}'}</div>
            <h3 className="text-xl font-bold text-text-primary mb-2">1안: 상세 기획</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              AI가 제품에 맞는 카피를 기획한 후<br />
              각 섹션별 레퍼런스를 지정하여 이미지를 생성합니다.
            </p>
            <div className="mt-4 text-xs text-text-tertiary">소요시간: 약 5-8분</div>
          </button>

          <button
            onClick={() => handleTrackSelect('simple')}
            className="bg-bg-secondary border-2 border-border-subtle rounded-2xl p-8 text-left hover:border-accent-primary transition-all group"
          >
            <div className="text-2xl mb-3">{'\u26A1'}</div>
            <h3 className="text-xl font-bold text-text-primary mb-2">2안: 심플 생성</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              고정 섹션 구성으로<br />
              바로 이미지를 생성합니다.
            </p>
            <div className="mt-4 text-xs text-text-tertiary">소요시간: 약 3-5분</div>
          </button>
        </div>
      )}

      {/* ===== Phase: Plan Generation (loading) ===== */}
      {phase === 'plan' && (
        <div className="bg-bg-secondary border border-border-subtle rounded-2xl p-8 mb-6">
          <div className="text-center mb-6">
            <div className="text-4xl mb-3 animate-pulse">{'\u{1F4CB}'}</div>
            <h3 className="text-lg font-bold text-text-primary mb-1">기획서 생성 중</h3>
            <p className="text-sm text-text-tertiary">Claude가 섹션 기획을 작성하고 있습니다...</p>
          </div>
          <div className="w-full bg-bg-tertiary rounded-full h-4">
            <div
              className="h-4 rounded-full animate-pulse"
              style={{
                width: '60%',
                background: 'linear-gradient(90deg, var(--accent-primary), #a78bfa)',
              }}
            />
          </div>
        </div>
      )}

      {/* ===== Phase: Config (Plan Review + Section Reference Upload) ===== */}
      {phase === 'config' && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-text-primary">섹션 구성 확인</h2>
              <p className="text-sm text-text-tertiary mt-1">각 섹션별 레퍼런스 이미지를 지정하고 비율을 선택하세요</p>
            </div>
            <button
              onClick={resetToStart}
              className="px-4 py-2 bg-bg-secondary border border-border-subtle rounded-xl text-sm text-text-secondary hover:border-border-default transition-colors"
            >
              처음부터
            </button>
          </div>

          {/* Aspect Ratio Selector */}
          <div className="bg-bg-secondary border border-border-subtle rounded-xl p-4 mb-4">
            <label className="text-sm font-medium text-text-secondary mb-2 block">이미지 비율</label>
            <div className="flex gap-2">
              {ASPECT_RATIO_OPTIONS.map((ratio) => (
                <button
                  key={ratio}
                  onClick={() => setAspectRatio(ratio)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    aspectRatio === ratio
                      ? 'bg-accent-primary text-white'
                      : 'bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-bg-primary border border-border-subtle'
                  }`}
                >
                  {ratio}
                </button>
              ))}
            </div>
          </div>

          {/* Section List */}
          <div className="space-y-3 mb-6">
            {sections.map((section, i) => {
              const sectionName = 'label' in section ? (section as any).label : section.name;
              const headline = 'headline' in section ? (section as any).headline : '';
              const subCopy = 'subCopy' in section ? (section as any).subCopy : '';

              return (
                <div
                  key={i}
                  className="bg-bg-secondary border border-border-subtle rounded-xl p-4 flex gap-4 items-start"
                >
                  {/* Section Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-accent-primary bg-accent-primary/10 px-2 py-0.5 rounded">
                        {i + 1}
                      </span>
                      <span className="text-sm font-bold text-text-primary truncate">{sectionName}</span>
                      <span className="text-xs text-text-tertiary">({section.sectionType})</span>
                    </div>
                    {headline && (
                      <p className="text-sm text-text-secondary mt-1 line-clamp-2">{headline}</p>
                    )}
                    {subCopy && (
                      <p className="text-xs text-text-tertiary mt-0.5 line-clamp-1">{subCopy}</p>
                    )}
                  </div>

                  {/* Reference Image Upload */}
                  <div className="shrink-0 w-24">
                    {sectionRefs[i] ? (
                      <div className="relative group">
                        <img
                          src={sectionRefs[i]}
                          alt={`ref-${i}`}
                          className="w-24 h-24 object-cover rounded-lg border border-border-subtle"
                        />
                        <button
                          onClick={() => setSectionRefs(prev => {
                            const next = { ...prev };
                            delete next[i];
                            return next;
                          })}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          x
                        </button>
                      </div>
                    ) : (
                      <label className="w-24 h-24 border-2 border-dashed border-border-subtle rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-accent-primary transition-colors bg-bg-tertiary">
                        <span className="text-text-tertiary text-lg mb-0.5">+</span>
                        <span className="text-[10px] text-text-tertiary">레퍼런스</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = () => {
                                setSectionRefs(prev => ({ ...prev, [i]: reader.result as string }));
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Generate Images Button */}
          <button
            onClick={generateImages}
            className="w-full py-4 bg-accent-primary text-white rounded-xl text-base font-bold hover:opacity-90 transition-opacity"
          >
            이미지 생성 시작
          </button>
        </div>
      )}

      {/* ===== Phase: Image Generation Progress ===== */}
      {phase === 'generating' && isGenerating && (
        <div className="bg-bg-secondary border border-border-subtle rounded-2xl p-8 mb-6">
          <div className="text-center mb-6">
            <div className="text-4xl mb-3 animate-pulse">{'\uD83C\uDFA8'}</div>
            <h3 className="text-lg font-bold text-text-primary mb-1">이미지 생성 중</h3>
            <p className="text-sm text-text-tertiary">Gemini가 각 섹션 이미지를 생성하고 있습니다</p>
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

      {/* ===== Error ===== */}
      {error && phase !== 'plan' && !isGenerating && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 mb-6 text-center">
          <div className="text-red-400 text-sm mb-4">{error}</div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => { setError(null); setPhase('config'); }}
              className="px-6 py-2 bg-bg-secondary border border-border-subtle text-text-secondary rounded-xl text-sm font-bold hover:border-border-default transition-colors"
            >
              설정으로 돌아가기
            </button>
            <button
              onClick={retryImageGeneration}
              className="px-6 py-2 bg-accent-primary text-white rounded-xl text-sm font-bold hover:opacity-90"
            >
              이미지 재생성
            </button>
          </div>
        </div>
      )}

      {/* ===== Phase: Results ===== */}
      {phase === 'results' && !isGenerating && (
        <>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-text-primary">
              생성된 이미지 ({successCount}/{totalSections})
            </h2>
            <div className="flex gap-3">
              <button
                onClick={() => setPhase('config')}
                className="px-4 py-2 bg-bg-secondary border border-border-subtle rounded-xl text-sm text-text-secondary hover:border-border-default transition-colors"
              >
                설정 수정
              </button>
              <button
                onClick={retryImageGeneration}
                className="px-4 py-2 bg-bg-secondary border border-border-subtle rounded-xl text-sm text-text-secondary hover:border-border-default transition-colors"
              >
                이미지 재생성
              </button>
              <button
                onClick={resetToStart}
                className="px-4 py-2 bg-bg-secondary border border-border-subtle rounded-xl text-sm text-text-secondary hover:border-border-default transition-colors"
              >
                처음부터
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
              const section = sections[i];
              const sectionName = section ? ('label' in section ? (section as any).label : section.name) : `섹션 ${i + 1}`;

              return (
                <div
                  key={i}
                  className="bg-bg-secondary border border-border-subtle rounded-xl overflow-hidden cursor-pointer hover:border-accent-primary transition-colors group"
                  onClick={() => { if (img?.data && !img.error) { setEditingIndex(i); setEditPrompt(''); } }}
                >
                  <div className="aspect-[9/16] bg-bg-tertiary flex items-center justify-center relative">
                    {img?.data && !img.error ? (
                      <>
                        <img src={img.data} alt={sectionName} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                          <span className="text-white text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">클릭하여 수정</span>
                        </div>
                      </>
                    ) : img?.error ? (
                      <div className="text-center p-4">
                        <div className="text-red-400 text-xs">{img.error}</div>
                      </div>
                    ) : (
                      <div className="text-text-tertiary text-sm">대기중</div>
                    )}
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <div className="text-xs text-text-secondary truncate">{i + 1}. {sectionName}</div>
                    {img?.data && !img.error && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const a = document.createElement('a');
                          a.href = img.data;
                          a.download = `${String(i + 1).padStart(2, '0')}_${section?.name || 'section'}.png`;
                          a.click();
                        }}
                        className="text-xs text-accent-primary hover:underline shrink-0 ml-2"
                      >
                        저장
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ===== Edit Modal ===== */}
      {editingIndex !== null && generatedImages[editingIndex]?.data && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => !isEditing && setEditingIndex(null)}>
          <div className="bg-bg-secondary rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-text-primary">이미지 수정</h3>
                <button onClick={() => !isEditing && setEditingIndex(null)} className="text-text-tertiary hover:text-text-primary text-xl">{'\u2715'}</button>
              </div>

              <div className="rounded-xl overflow-hidden mb-4 bg-bg-tertiary">
                <img src={generatedImages[editingIndex].data} alt="원본" className="w-full max-h-[50vh] object-contain" />
              </div>

              {/* Show generation prompt */}
              {generatedImages[editingIndex].prompt && (
                <details className="mb-4">
                  <summary className="text-xs text-text-tertiary cursor-pointer hover:text-text-secondary transition-colors">
                    생성에 사용된 프롬프트 보기
                  </summary>
                  <pre className="mt-2 p-3 bg-bg-primary border border-border-subtle rounded-lg text-xs text-text-secondary whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {generatedImages[editingIndex].prompt}
                  </pre>
                </details>
              )}

              <textarea
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                placeholder='수정 요청을 입력하세요. 예: "배경을 더 밝게", "텍스트를 더 크게", "제품을 중앙에 배치"'
                rows={3}
                disabled={isEditing}
                className="w-full px-4 py-3 bg-bg-primary border border-border-subtle rounded-xl text-text-primary placeholder:text-text-tertiary focus:border-accent-primary focus:outline-none transition-colors resize-none mb-4"
              />

              <div className="flex gap-3">
                <button
                  onClick={() => setEditingIndex(null)}
                  disabled={isEditing}
                  className="flex-1 py-3 bg-bg-tertiary border border-border-subtle rounded-xl text-sm text-text-secondary hover:border-border-default transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleEditImage}
                  disabled={isEditing || !editPrompt.trim()}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                    isEditing || !editPrompt.trim()
                      ? 'bg-bg-tertiary text-text-tertiary cursor-not-allowed'
                      : 'bg-accent-primary text-white hover:opacity-90'
                  }`}
                >
                  {isEditing ? '수정 중...' : '수정 적용'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
