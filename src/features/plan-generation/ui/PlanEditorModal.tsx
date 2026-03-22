import { useState } from 'react';
import { Modal } from '@/shared/ui/components/Modal';
import { useProductStore } from '@/entities/product';
import { useToastStore } from '@/features/theme';
import { parseSections } from '@/features/plan-generation/api/plan-service';

interface PlanEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 기획서 수정 모달
 */
export function PlanEditorModal({ isOpen, onClose }: PlanEditorModalProps) {
  const { generatedPlan, setGeneratedPlan, setGeneratedSections } =
    useProductStore();
  const showToast = useToastStore((s) => s.showToast);

  const [editText, setEditText] = useState('');

  const [prevOpen, setPrevOpen] = useState(false);
  if (isOpen && !prevOpen) {
    setEditText(generatedPlan);
  }
  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen);
  }

  const handleSave = () => {
    setGeneratedPlan(editText);
    const newSections = parseSections(editText);
    setGeneratedSections(newSections);
    onClose();
    showToast('기획서가 수정되었습니다!', 'success');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="기획서 수정"
      footer={
        <>
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium rounded-[10px] cursor-pointer transition-all duration-150 bg-bg-elevated text-text-primary border border-border-default hover:bg-bg-hover hover:border-border-strong"
          >
            취소
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
      <textarea
        value={editText}
        onChange={(e) => setEditText(e.target.value)}
        className="w-full min-h-[400px] p-5 bg-bg-tertiary border-none rounded-[10px] text-text-primary font-mono text-[0.85rem] leading-relaxed resize-none outline-none focus:ring-1 focus:ring-accent-primary/30 transition-all duration-150"
        style={{ height: '60vh' }}
        spellCheck={false}
      />
    </Modal>
  );
}
