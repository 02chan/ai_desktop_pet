<div align="center">

# AI Desktop Pet

**Electron + React + Tailwind CSS + Google Gemini API 기반의 데스크톱 인공지능 비서 펫**

</div>

---

## 🛠️ Tech Stack
- **Runtime & Frame**: Electron, Node.js
- **Frontend**: React 18 (TypeScript), Vite, Tailwind CSS
- **State & Animation**: Framer Motion (`motion/react`), React Hooks
- **Icons & Timing**: Lucide React, date-fns
- **AI Engine**: Google Gemini API

---

## ⚙️ Core Modules & Features

### 1. Desktop Pet Module (`Pet.tsx`)
* **Window Drag & Drop**: 마우스 드래그를 통합한 절대 좌표 배치 지원.
* **Sprite Animation State Machine**: idle, hovering, blinking, talking (TTS 오디오 출력을 감지하여 입 모양 싱크 재생) 애니메이션 스테이트 전환 제어.
* **Smart Transparent Window overlay**: 마우스 호버 여부에 따른 Click-through (클릭 통과) 및 투명 영역 감지 제어 (`pointer-events` 속성 동적 바인딩).

### 2. AI Chat Module (`Chat.tsx`)
* **Gemini API Integration**: 프록시 API 핸들러 인터페이스를 통한 실시간 자연어 처리 및 지능형 피드백 수신.
* **Dual View UI**:
  - 캐릭터 상단 유동 배치형 '말풍선 모드 (Bubble Overlay)'
  - 디테일 질문용 '대화 이력 패널 모드 (History Panel)'
* **Context Preservation**: 대화 이력 세션 스토리지 메모리 보존을 통해 이전 맥락을 유지한 복합 대화 가능.

### 3. Calendar & To-Do List Module (`Calendar.tsx`, `Todo.tsx`)
* **Grid Calendar**: 월 단위 캘린더 일정 CRUD (생성·조회·수정·삭제).
* **Audio Synthesizer Alert**: 설정된 타임스탬프와 매칭 시 정밀 스케줄링 폴러가 작동하여 커스텀 알람 사운드 신시사이저 비프음을 출력하고 말풍선 UI 연계.
* **Slide-out To-Do Widget**: Calendar 컴포넌트 우측 버튼 래핑을 통하여 To-Do 컴포넌트(`Todo.tsx`)를 슬라이딩 애니메이션 형태로 마운트/언마운트 처리.
* **Multi-Interval Task Sweeper (⏳)**:
  - **Today (자동)**: 캘린더 당일 일정 데이터 배열 객체(`CalendarEvent[]`)를 실시간 감지하여 자동 할일 목록으로 수집 및 갱신.
  - **Daily / Weekly / Monthly (수동)**: 사용자 독립 입력 기반 리스크 제어.
  - **Automated Reset Poll Engine**: 각 일정이 목표 주기 파라미터(지정 시간 0~23시, 지정 요일 0~6, 지정 일자 1~31일)를 초과하였는지 `setInterval` 기준 15초 주기로 스캔 타겟팅 분석 후 클라이언트 로컬 캐시 자동 초기화 처리.
  - **Dynamic Priority Sorting**: Daily(시간순), Weekly(요일순), Monthly(날짜순)의 정밀 파라미터를 파싱하여 UI 렌더링 전 인라인 오름차순 우선순위 자동 분류.

---

## 📦 Scripts & Packages

### 1. 환경 설정 (.env.local)
루트 경로에 `.env.local` 파라미터 정의가 필요합니다.
```env
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

### 2. 패키지 실행 및 빌드

- **종속성 패키지 설치**:
  ```bash
  npm install
  ```
  
- **데스크톱 개발 모드 실행**:
  ```bash
  npm run desktop
  ```

- **설치용 배포 패키지 (.exe) 빌드**:
  ```bash
  npm run dist:installer
  ```
  * 실행 완료 시 `release/AI DeskPet Setup 0.0.0.exe` 파일이 호스트 파일 시스템 내에 생성됩니다.
