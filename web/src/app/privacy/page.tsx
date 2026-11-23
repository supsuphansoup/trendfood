import type { Metadata } from "next";
import { SiteInfoPage } from "@/components/site-info-page";
import { OPERATOR_EMAIL } from "@/data/site";
import { ANALYTICS_ID } from "@/lib/analytics";

export const metadata: Metadata = { title: "개인정보처리방침 | 트렌드푸드", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return (
    <SiteInfoPage title="개인정보처리방침" effectiveDate="2026년 11월 20일">
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
          <li>요리 모드에서 완료한 단계와 방문 통계 허용 여부</li>
        </ul>
      </section>
      <section>
        <h2>3. 접속 기록</h2>
        <p>서비스는 Cloudflare Pages 에 올려져 있어요. 사이트를 안전하게 전달하고 공격을 막기 위해 Cloudflare 가 IP 주소, 접속 시각, 브라우저 종류 같은 접속 기록을 처리할 수 있어요. 운영자는 이 기록으로 방문자가 누구인지 알아내지 않아요.</p>
      </section>
      <section>
        <h2>4. 쿠팡 링크와 YouTube 영상</h2>
        <p>재료 링크를 누르면 쿠팡 사이트가 새 창으로 열려요. 그때부터는 쿠팡의 개인정보처리방침이 적용돼요. 쿠팡은 제휴 실적을 확인하려고 쿠키를 쓸 수 있어요. 서비스는 방문자가 쿠팡에서 무엇을 샀는지 알 수 없어요.</p>
        <p>홈과 음식 상세의 원본 영상은 YouTube 공식 플레이어로 보여 줘요. ‘영상 보기’를 누르거나 플레이어가 있는 상세 영역을 열면 IP 주소 같은 접속 정보가 YouTube(Google)에 전달되고, 영상을 재생하면 쿠키 같은 기록이 저장될 수 있어요. 이때는 <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google 개인정보처리방침</a>이 적용돼요.</p>
      </section>
      <section>
        <h2>5. 광고와 방문 분석</h2>
        <p>방문 분석 설정이 연결된 경우, 하단 ‘방문 통계 설정’에서 허용한 방문자에 한해 Google Analytics 4를 불러와요. 허용하지 않으면 분석 도구를 불러오지 않아요. {!ANALYTICS_ID && "현재 측정 ID가 연결되지 않아 분석하지 않아요."}</p>
        <p>허용하면 페이지 방문, 음식 선택, 찜·해제, 검색 횟수와 검색어 길이, 쿠팡 링크 클릭을 Google에 보내요. 검색어 원문, URL의 검색 조건, 보유 재료 목록과 이메일은 분석 이벤트에 넣지 않아요. 실제 구매·결제 내역은 알 수 없어요. Google이 분석용 쿠키와 접속 정보를 처리하며, 광고 개인화와 Google 신호는 사용하지 않아요. <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google 개인정보처리방침</a>에서 제공자의 처리 방식을 확인할 수 있어요.</p>
        <p>허용 여부는 하단에서 언제든 바꿀 수 있어요. 허용을 취소하면 이후 분석 이벤트 전송을 중지하고 이 사이트의 분석용 쿠키를 지워요. 이미 전송된 통계와 보관 설정은 Google Analytics 관리 설정의 적용을 받아요.</p>
      </section>
      <section>
        <h2>6. 보관 기간과 삭제</h2>
        <p>문의·삭제 요청 메일은 처리가 끝난 날부터 1년 동안 보관한 뒤 지워요. 더 일찍 지우길 원하면 메일로 알려 주세요.</p>
        <p>브라우저에 저장된 기록은 방문자가 직접 지울 수 있어요.</p>
      </section>
      <section>
        <h2>7. 다른 곳에 주는 정보</h2>
        <p>방문자의 개인정보를 판매하지 않아요. 사이트 제공, 외부 영상·구매 링크, 허용한 방문 분석에는 위에 설명한 제공자의 서비스가 사용돼요. 법에 따른 정당한 정보 제공 요청에는 정해진 절차로 대응해요.</p>
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
