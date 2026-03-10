import { useState } from 'react';
import { Modal } from '@/shared/ui/components/Modal';
import { useProductStore } from '@/entities/product';
import { useToastStore } from '@/features/theme';
import type { Section } from '@/shared/types';

function parseSections(text: string): Section[] {
  const sections: Section[] = [];
  const regex = /\[SECTION_START\]([\s\S]*?)\[SECTION_END\]/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const content = match[1];

    const numMatch = content.match(/섹션번호:\s*(\d+)/);
    const nameMatch = content.match(/섹션명:\s*(.+)/);
    const purposeMatch = content.match(/목적:\s*(.+)/);
    const headlineMatch = content.match(/헤드라인:\s*(.+)/);
    const headlineAltMatch = content.match(/헤드라인대안:\s*(.+)/);
    const subMatch = content.match(/서브카피:\s*(.+)/);
    const subAltMatch = content.match(/서브카피대안:\s*(.+)/);
    const visualMatch = content.match(/비주얼 지시:\s*([\s\S]+?)(?=\n[가-힣]+:|$)/);
    const visualAltMatch = content.match(/비주얼지시대안:\s*(.+)/);

    const section: Section = {
      number: numMatch ? parseInt(numMatch[1]) : sections.length + 1,
      name: nameMatch ? nameMatch[1].trim() : `섹션 ${sections.length + 1}`,
      purpose: purposeMatch ? purposeMatch[1].trim() : '',
      headline: headlineMatch ? headlineMatch[1].trim() : '',
      subCopy: subMatch ? subMatch[1].trim() : '',
      visualPrompt: visualMatch ? visualMatch[1].trim() : '',
      headlineAlts: headlineAltMatch
        ? headlineAltMatch[1]
            .split('|')
            .map((s) => s.trim())
            .filter((s) => s)
        : [],
      subCopyAlts: subAltMatch
        ? subAltMatch[1]
            .split('|')
            .map((s) => s.trim())
            .filter((s) => s)
        : [],
      visualPromptAlts: visualAltMatch
        ? visualAltMatch[1]
            .split('|')
            .map((s) => s.trim())
            .filter((s) => s)
        : [],
    };

    sections.push(section);
  }

  if (sections.length === 0) {
    for (let i = 1; i <= 8; i++) {
      sections.push({
        number: i,
        name: `섹션 ${i}`,
        purpose: '',
        headline: '',
        subCopy: '',
        visualPrompt: 'Product photography, clean background, professional lighting',
        headlineAlts: [],
        subCopyAlts: [],
        visualPromptAlts: [],
      });
    }
  }

  return sections;
}

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
