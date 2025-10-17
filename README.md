# kkambbak-frontend
깜빡 프로젝트 - 프론트

# kkambbak-frontend

깜빡 프로젝트 프론트엔드. React + Vite + TypeScript 기반.

## 실행
```bash
npm install
npm run dev
# build / preview
npm run build
npm run preview
```

## 폴더 개요
```
src/
 ├─ app/            # router, queryClient 등 전역
 ├─ components/     
 ├─ hooks/
 ├─ pages/
 │   ├─ splash/
 │   ├─ main/
 │   └─ ...
 ├─ routes/         # Protected 등
 ├─ stores/         # Zustand
 └─ index.css       # Tailwind entry
```

## Versions
> 실제 설치 버전은 `package.json` 기준. 아래는 현재 기준 값.

| Tool / Lib | Version |
| --- | --- |
| Node.js | ≥ 18 |
| React | 18.3.1 |
| React DOM | 18.3.1 |
| React Router DOM | 6.27.0 |
| TypeScript | 5.x |
| Vite | 7.1.10 |
| Tailwind CSS | 4.x (`@tailwindcss/postcss`) |
| Zustand | 4.x |
| TanStack Query | 5.x |
| Axios | 1.x |

최신 값 확인:
```bash
node -p "const p=require('./package.json');({node:process.version, ...p.dependencies, ...p.devDependencies})"
```

## 브랜치 전략
- `main` 배포, `develop` 통합
- 작업 브랜치: `feature/REQ-0001`, `fix/REQ-0003`
- PR 필수, 최소 1명 리뷰, **Squash and Merge**

## 커밋 컨벤션
```
<타입>: [요구사항 ID] 요약
# 예) Feat: [REQ-0002] 로그인 화면 UI
```
타입: Feat, Fix, Update, Modify, Delete, Refactor, Docs, Test, Chore
```