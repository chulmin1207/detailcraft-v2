import { useState, useEffect, useCallback } from 'react';
import { Modal } from '@/shared/ui/components/Modal';
import { useProductStore } from '@/entities/product';
import { useImageStore } from '@/entities/image';
import { useToastStore } from '@/features/theme';
import { BACKEND_URL } from '@/shared/config/constants';

interface CopySuggestModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectionIndex: number;
  type: 'headline' | 'subcopy';
}

/**
 * 카피 대안 추천 모달
 */
export function CopySuggestModal({
  isOpen,
  onClose,
  sectionIndex,
  type,
}: CopySuggestModalProps) {
  const { generatedSections, setGeneratedSections, productName, productFeatures } =
    useProductStore();
  const { geminiApiKey, useBackend } = useImageStore();
  const showToast = useToastStore((s) => s.showToast);

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && sectionIndex != null && generatedSections[sectionIndex]) {
      const section = generatedSections[sectionIndex];
      const alts =
        type === 'headline' ? section.headlineAlts : section.subCopyAlts;
      setSuggestions(alts && alts.length > 0 ? [...alts] : []);
      setError(null);
      setLoading(false);
    }
  }, [isOpen, sectionIndex, type, generatedSections]);

  const handleSelect = useCallback(
    (copy: string) => {
      setGeneratedSections((prev) => {
        const updated = [...prev];
        if (type === 'headline') {
          updated[sectionIndex] = { ...updated[sectionIndex], headline: copy };
        } else {
          updated[sectionIndex] = { ...updated[sectionIndex], subCopy: copy };
        }
        return updated;
      });

      onClose();
      showToast('카피가 적용되었습니다!', 'success');
    },
    [sectionIndex, type, setGeneratedSections, onClose, showToast],
  );

  const handleRegenerate = useCallback(async () => {
    if (!useBackend && !geminiApiKey) {
      showToast('API 키를 설정해주세요.', 'error');
      return;
    }

    const section = generatedSections[sectionIndex];
    if (!section) return;

    setLoading(true);
    setError(null);

    try {
      const prompt = `당신은 e-커머스 상세페이지 전문 카피라이터입니다.

## 제품 정보
- 제품명: ${productName || ''}
- 제품 특징: ${productFeatures || ''}

## 섹션 정보
- 섹션명: ${section.name}
- 섹션 목적: ${section.purpose}

## 요청
이 섹션에 적합한 ${type === 'headline' ? '헤드라인' : '서브카피'}을 10개 추천해주세요.

## 조건
- ${type === 'headline' ? '15자 이내의 임팩트 있는 문구' : '40자 이내의 보조 설명'}
- 각각 다른 스타일과 톤으로 다양하게 작성
- 한국어로 작성
- 구매 욕구를 자극하는 문구

## 출력 형식 (JSON 배열만 출력, 다른 텍스트 없이)
["첫번째", "두번째", "세번째", "네번째", "다섯번째", "여섯번째", "일곱번째", "여덟번째", "아홉번째", "열번째"]`;

      const url = useBackend
        ? `${BACKEND_URL}/api/gemini`
        : `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;

      const requestBody: Record<string, unknown> = {
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 1000,
        },
      };

      if (useBackend) {
        requestBody.model = 'gemini-2.5-flash';
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('API 요청 실패');
      }

      const data = await response.json();
      const text = data.candidates[0].content.parts[0].text;

      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('응답 파싱 실패');

      const newSuggestions = JSON.parse(jsonMatch[0]) as string[];

      setGeneratedSections((prev) => {
        const updated = [...prev];
        if (type === 'headline') {
          updated[sectionIndex] = {
            ...updated[sectionIndex],
            headlineAlts: newSuggestions,
          };
        } else {
          updated[sectionIndex] = {
            ...updated[sectionIndex],
            subCopyAlts: newSuggestions,
          };
        }
        return updated;
      });

      setSuggestions(newSuggestions);
      showToast('새로운 카피가 생성되었습니다!', 'success');
    } catch (err) {
      console.error('Copy regeneration error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [
    useBackend,
    geminiApiKey,
    generatedSections,
    sectionIndex,
    type,
    productName,
    productFeatures,
    setGeneratedSections,
    showToast,
  ]);

  const typeLabel = type === 'headline' ? '헤드라인' : '서브카피';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${typeLabel} 대안`}>
      <div className="max-h-[400px] overflow-y-auto -mx-6 px-3">
        {loading ? (
          <div className="py-10 text-center text-text-tertiary">
            <p className="mb-2">AI가 새로운 카피를 생성하고 있습니다...</p>
            <p className="text-xs text-text-quaternary">Credit이 사용됩니다.</p>
          </div>
        ) : error ? (
          <div className="py-10 text-center text-accent-danger">
            <p>생성 실패: {error}</p>
          </div>
        ) : suggestions.length > 0 ? (
          suggestions.map((copy, i) => (
            <div
              key={i}
              onClick={() => handleSelect(copy)}
              className="py-3.5 px-4 bg-bg-tertiary border border-border-subtle rounded-[10px] mb-2 cursor-pointer transition-all duration-150 hover:border-accent-primary hover:bg-accent-primary/10 last:mb-0"
            >
              <p className="text-[0.95rem] leading-relaxed text-text-primary">
                {copy}
              </p>
            </div>
          ))
        ) : (
          <div className="py-8 text-center text-text-secondary">
            <p className="mb-1">저장된 대안이 없습니다.</p>
            <p className="text-[0.8rem] text-text-tertiary">
              아래 버튼을 눌러 새로 생성하세요.
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-border-subtle text-center">
        <p className="text-[0.8rem] text-text-tertiary mb-2.5">
          마음에 드는 게 없나요?
        </p>
        <button
          onClick={handleRegenerate}
          disabled={loading}
          className="px-5 py-2.5 bg-gradient-to-br from-accent-warning to-accent-secondary border-none rounded-[10px] text-white text-[0.85rem] font-medium cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_4px_15px_rgba(245,158,11,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
        >
          {loading ? '생성 중...' : 'Credit 사용하여 새로 10개 생성'}
        </button>
      </div>
    </Modal>
  );
}
