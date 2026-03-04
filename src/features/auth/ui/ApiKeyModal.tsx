import { useState } from 'react';
import { Modal } from '@/shared/ui/components/Modal';
import { useImageStore } from '@/entities/image';
import { useToastStore } from '@/features/theme';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * API 키 설정 모달
 * Claude API Key (기획서 생성용)와 Gemini API Key (이미지 생성용)를
 * 입력/저장/삭제할 수 있는 모달.
 */
export function ApiKeyModal({ isOpen, onClose }: ApiKeyModalProps) {
  const { claudeApiKey, geminiApiKey, saveApiKeys, clearApiKeys } = useImageStore();
  const showToast = useToastStore((s) => s.showToast);

  const [claudeInput, setClaudeInput] = useState(claudeApiKey);
  const [geminiInput, setGeminiInput] = useState(geminiApiKey);
  const [showClaude, setShowClaude] = useState(false);
  const [showGemini, setShowGemini] = useState(false);

  const [prevOpen, setPrevOpen] = useState(false);
  if (isOpen && !prevOpen) {
    setClaudeInput(claudeApiKey);
    setGeminiInput(geminiApiKey);
    setShowClaude(false);
    setShowGemini(false);
  }
  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen);
  }

  const handleSave = () => {
    const claude = claudeInput.trim();
    const gemini = geminiInput.trim();

    if (claude && !claude.startsWith('sk-ant-')) {
      showToast('Claude API 키 형식이 올바르지 않습니다.', 'error');
      return;
    }
    if (gemini && !gemini.startsWith('AIza')) {
      showToast('Gemini API 키 형식이 올바르지 않습니다.', 'error');
      return;
    }

    saveApiKeys(claude, gemini);
    onClose();
    showToast('API 키가 저장되었습니다!', 'success');
  };

  const handleClear = () => {
    clearApiKeys();
    setClaudeInput('');
    setGeminiInput('');
    onClose();
    showToast('API 키가 삭제되었습니다.', 'success');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="API 키 설정"
      footer={
        <>
          <button
            onClick={handleClear}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium rounded-[10px] border-none cursor-pointer transition-all duration-150 bg-accent-danger text-white hover:brightness-110"
          >
            삭제
          </button>
          <button
            onClick={handleSave}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium rounded-[10px] border-none cursor-pointer transition-all duration-150 bg-accent-primary text-white hover:bg-accent-primary-hover"
          >
            저장
          </button>
        </>
      }
    >
      {/* Claude API Key */}
      <div className="mb-5">
        <label className="flex items-center gap-2 text-sm font-medium mb-2 text-text-primary">
          <span className="px-2 py-0.5 rounded-full text-[0.7rem] font-semibold bg-accent-primary/20 text-accent-primary-hover">
            Claude
          </span>
          Anthropic API Key (기획서 생성용)
        </label>
        <div className="relative">
          <input
            type={showClaude ? 'text' : 'password'}
            value={claudeInput}
            onChange={(e) => setClaudeInput(e.target.value)}
            placeholder="sk-ant-..."
            className="w-full py-3 pl-4 pr-11 bg-bg-tertiary border border-border-subtle rounded-[10px] text-text-primary font-mono text-[0.8rem] outline-none focus:border-accent-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] transition-all duration-150"
          />
          <button
            type="button"
            onClick={() => setShowClaude(!showClaude)}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-text-tertiary cursor-pointer text-base hover:text-text-primary transition-colors duration-150"
            aria-label={showClaude ? 'API 키 숨기기' : 'API 키 보기'}
          >
            {showClaude ? '\uD83D\uDE48' : '\uD83D\uDC41\uFE0F'}
          </button>
        </div>
        <p className="text-xs text-text-tertiary mt-1.5 leading-relaxed">
          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-primary-hover no-underline hover:underline"
          >
            Anthropic Console
          </a>
          에서 API 키를 발급받으세요.
        </p>
      </div>

      {/* Gemini API Key */}
      <div className="mb-5">
        <label className="flex items-center gap-2 text-sm font-medium mb-2 text-text-primary">
          <span className="px-2 py-0.5 rounded-full text-[0.7rem] font-semibold bg-accent-gemini/20 text-accent-gemini">
            Gemini
          </span>
          Google AI API Key (이미지 생성용)
        </label>
        <div className="relative">
          <input
            type={showGemini ? 'text' : 'password'}
            value={geminiInput}
            onChange={(e) => setGeminiInput(e.target.value)}
            placeholder="AIza..."
            className="w-full py-3 pl-4 pr-11 bg-bg-tertiary border border-border-subtle rounded-[10px] text-text-primary font-mono text-[0.8rem] outline-none focus:border-accent-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] transition-all duration-150"
          />
          <button
            type="button"
            onClick={() => setShowGemini(!showGemini)}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-text-tertiary cursor-pointer text-base hover:text-text-primary transition-colors duration-150"
            aria-label={showGemini ? 'API 키 숨기기' : 'API 키 보기'}
          >
            {showGemini ? '\uD83D\uDE48' : '\uD83D\uDC41\uFE0F'}
          </button>
        </div>
        <p className="text-xs text-text-tertiary mt-1.5 leading-relaxed">
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-primary-hover no-underline hover:underline"
          >
            Google AI Studio
          </a>
          에서 API 키를 발급받으세요.
        </p>
      </div>

      {/* 안내 문구 */}
      <div className="px-4 py-3 bg-accent-gemini/10 border border-accent-gemini/30 rounded-[10px] mt-2">
        <p className="text-[0.8rem] text-accent-gemini leading-relaxed">
          API 키는 브라우저 로컬 저장소에만 저장되며 외부로 전송되지 않습니다.
        </p>
      </div>
    </Modal>
  );
}
