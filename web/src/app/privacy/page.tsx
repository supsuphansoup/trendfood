import type { Metadata } from "next";
import { SiteInfoPage } from "@/components/site-info-page";
import { OPERATOR_EMAIL } from "@/data/site";

export const metadata: Metadata = { title: "개인정보처리방침 | 트렌드푸드" };

export default function PrivacyPage() {
  return (
    <SiteInfoPage title="개인정보처리방침" effectiveDate="2026년 11월 10일">
      <p>트렌드푸드(이하 &quot;서비스&quot;)는 방문자의 개인정보를 되도록 받지 않도록 만들었어요. 이 문서는 서비스가 어떤 정보를 다루는지 알려 드려요.</p>
      <section>
        <h2>1. 받는 개인정보</h2>
        <p>회원가입과 로그인이 없어요. 방문자의 이름, 이메일, 전화번호, 주소를 받지 않아요.</p>
        <p>운영자에게 메일을 보내면, 보낸 분의 메일 주소와 메일 내용을 답변과 요청 처리를 위해 보관해요.</p>
      </section>
      <section>
        <h2>2. 이 브라우저에만 저장되는 기록</h2>
        <p>아래 기록은 방문자의 브라우저 저장 공간(localStorage)에만 저장되고, 서비스 서버로 보내지 않아요. 브라우저의 사이트 데이터를 지우면 함께 지워져요.</p>
        <ul>
          <li>찜한 음식</li>
          <li>&quot;집에 있어요&quot;로 표시한 재료</li>
          <li>재료 연속 담기에서 이미 담은 재료</li>
          <li>통합 장바구니에 넣은 재료</li>
        </ul>
      </section>
      <section>
        <h2>3. 접속 기록</h2>
        <p>서비스는 Cloudflare Pages 에 올려져 있어요. 사이트를 안전하게 전달하고 공격을 막기 위해 Cloudflare 가 IP 주소, 접속 시각, 브라우저 종류 같은 접속 기록을 처리할 수 있어요. 운영자는 이 기록으로 방문자가 누구인지 알아내지 않아요.</p>
      </section>
      <section>
        <h2>4. 쿠팡 링크</h2>
        <p>재료 링크를 누르면 쿠팡 사이트가 새 창으로 열려요. 그때부터는 쿠팡의 개인정보처리방침이 적용돼요. 쿠팡은 제휴 실적을 확인하려고 쿠키를 쓸 수 있어요. 서비스는 방문자가 쿠팡에서 무엇을 샀는지 알 수 없어요.</p>
      </section>
      <section>
        <h2>5. 광고와 방문 분석</h2>
        <p>지금은 광고와 방문 분석 도구를 쓰지 않아요. 앞으로 쓰게 되면, 쓰기 전에 이 문서를 먼저 고치고 어떤 정보를 다루는지 알려 드려요.</p>
      </section>
      <section>
        <h2>6. 보관 기간과 삭제</h2>
        <p>문의·삭제 요청 메일은 처리가 끝난 날부터 1년 동안 보관한 뒤 지워요. 더 일찍 지우길 원하면 메일로 알려 주세요.</p>
        <p>브라우저에 저장된 기록은 방문자가 직접 지울 수 있어요.</p>
      </section>
      <section>
        <h2>7. 다른 곳에 주는 정보</h2>
        <p>방문자의 개인정보를 다른 회사나 사람에게 팔거나 넘기지 않아요. 법에 따라 수사기관 등이 정해진 절차로 요청하는 경우에만 예외예요.</p>
      </section>
      <section>
        <h2>8. 내 정보에 대한 권리</h2>
        <p>운영자가 보관 중인 내 메일 주소와 메일 내용을 보여 달라고 하거나, 고치거나 지워 달라고 요청할 수 있어요. 아래 메일로 요청하면 10일 안에 처리하고 알려 드려요.</p>
      </section>
      <section>
        <h2>9. 운영자 계정</h2>
        <p>운영자가 관리 화면에 로그인할 때 쓰는 메일 주소는 Supabase 에 저장돼요. 방문자와는 관계가 없어요.</p>
      </section>
      <section>
        <h2>10. 개인정보 보호책임자</h2>
        <p>트렌드푸드 운영팀</p>
        <a href={`mailto:${OPERATOR_EMAIL}`}>{OPERATOR_EMAIL}</a>
      </section>
      <section>
        <h2>11. 문서가 바뀔 때</h2>
        <p>이 문서를 고치면 시행일 7일 전부터 이 페이지에 알려요.</p>
      </section>
    </SiteInfoPage>
  );
}
