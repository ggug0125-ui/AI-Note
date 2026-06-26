import { CreditCard, UploadCloud } from "lucide-react";

export function DocumentUploadCard() {
  return (
    <section className="rounded-3xl border border-[#E9D8BD] bg-[linear-gradient(135deg,#FFFDF8_0%,#FFF8EE_100%)] p-5 shadow-[0_14px_34px_rgba(124,82,27,0.07)]">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FFF3E5] text-coral">
          <UploadCloud size={23} />
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-[#8A7354]">Document Center</p>
          <h2 className="mt-2 text-2xl font-black text-[#2F2418]">문서 업로드를 시작하세요</h2>
          <p className="mt-3 text-sm font-bold leading-6 text-[#6F5A40]">
            아래 기존 업로드 영역에서 문서를 추가하면 이곳에서 문서 상태와 다음 작업을 한눈에 확인할 수 있습니다.
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-[#EAD8C1] bg-white/75 p-4">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-[#8A7354]">
          <CreditCard size={16} className="text-coral" />
          크레딧 정책
        </div>
        <p className="mt-3 text-sm font-bold leading-6 text-[#6F5A40]">
          PDF는 1~2페이지 1크레딧, 3페이지 이상 페이지당 0.5크레딧이 필요합니다.
          TXT는 1크레딧부터 시작합니다.
          분석이 성공한 경우에만 크레딧이 차감됩니다.
        </p>
      </div>
    </section>
  );
}
