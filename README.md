# EucliDraw Penrose Studio 확장 (`jiwonme/euclidraw-penrose-studio-extension`)

[Penrose](https://github.com/penrose/penrose)의 **.domain · .substance · .style** 세 소스로 도해를 선언하는 **Penrose Studio** 확장의 출발점입니다. 이 저장소는 현재 **템플릿 스캐폴드**이며, Penrose 컴파일러나 Studio 편집기는 아직 구현되어 있지 않습니다.

스캐폴드는 alid의 공개 `ExtensionPackageSpec` 계약만으로 다음 배선을 끝까지 검증합니다.

- 도구 선반의 **Penrose Studio 도해 추가** 버튼과 같은 명령
- `canvas.creation`을 통한 명시적 생성과 호스트의 단일 Undo
- 인스펙터의 선언형 속성 편집(제목·설명·배경색)
- DOM 미리보기와 DOM이 없는 상태의 순수 SVG 출판 경로
- watch 개발 서버, 설치 매니페스트 SHA-256, CI 검증

> 현재 설치하면 스캐폴드 자리표시자 카드가 추가됩니다. Penrose 소스 편집과 렌더링은 아래 로드맵의 다음 단계입니다.

## 설치

alid(EucliDraw)의 **확장 관리 → GitHub에서 설치**에 다음을 입력합니다.

```text
jiwonme/euclidraw-penrose-studio-extension
```

설치 API 2를 지원하는 호스트가 필요합니다. 설치 후 왼쪽 도구 선반의 **Penrose Studio 도해 추가** 또는 명령 팔레트의 같은 명령으로 카드를 만듭니다.

## 현재 구조

| 파일 | 역할 |
| --- | --- |
| `extension.json` | 확장 ID `diagram.penrose-studio`, 버전, 커널 호환 범위, 의존성·제공 선언의 원본 |
| `src/manifest.js` | 번들과 설치 명세가 공유하는 패키지 계약. 어스펙트 ID `${id}.diagram` 생성 |
| `src/index.js` | 자리표시자 어스펙트, 순수 `derive`, DOM/SVG 렌더, 선언형 UI, 명령, 활성화·정리 |
| `scripts/` | 설정 검증, 단일 ESM 번들 빌드, 설치 매니페스트, watch 개발 서버 |
| `test/` | 번들 계약, 파생·생성·정리, 설정, 개발 서버 회귀 테스트 |
| `dist/plugin.js`, `alid.extension.json` | 커밋되는 배포 산출물과 SHA-256 설치 명세 |
| `docs/` | 공개 확장 API 안내와 웹 개발 가이드 |

## 개발

Node.js 22.12 이상과 `pnpm@11.22.0`을 사용합니다.

```sh
pnpm install --frozen-lockfile
pnpm test       # dist 빌드 + 계약 테스트
pnpm check:dist # 커밋된 dist/plugin.js·alid.extension.json 최신 여부
```

watch 개발 서버:

```sh
pnpm dev        # http://127.0.0.1:5174
```

alid의 **확장 관리 → 개발 중인 확장 연결**에 주소를 입력하고 승인하면 `src/` 저장 시 다시 빌드되어 캔버스에 반영됩니다. 개발 출력은 `.alid-dev/`에만 생성됩니다.

배포하려면 소스와 함께 `dist/plugin.js`, `alid.extension.json`, `pnpm-lock.yaml`을 커밋하고 기본 브랜치에 푸시합니다. 별도 웹 호스팅이나 npm 배포는 필요하지 않습니다.

## Penrose Studio 로드맵

이 저장소는 다음 순서로 확장할 수 있도록 스캐폴드만 준비했습니다.

1. **정본 스키마**: `diagram.penrose-studio.diagram`에 `.domain`, `.substance`, `.style`, `variation`을 저장하고, 파생 SVG는 `Computed`로만 계산합니다.
2. **컴파일 경계**: `@penrose/core`의 `compile → optimize → toSVG` 파이프라인을 확장 내부 모듈로 분리하고, 실패 시 마지막 성공 렌더를 보존합니다.
3. **Studio 편집기**: 선택 시 인스펙터에 세 파일 탭·줄 번호·진단·적용/복원을 제공하고, 적용은 한 정본 배치와 한 Undo 그룹으로 기록합니다.
4. **출판 일치**: DOM이 언마운트되어도 `renderSvg`가 같은 기하를 출력하는지 회귀 테스트로 고정합니다.
5. **번들 예산**: `@penrose/core`를 포함하면 번들이 커지므로, 설치 한도와 초기 컴파일 비용을 측정해 문서화합니다.

기존의 단일 컴포넌트 구현은 [`jiwonme/euclidraw-penrose-extension`](https://github.com/jiwonme/euclidraw-penrose-extension)에 있습니다. 이 저장소는 그 구현을 그대로 복사한 것이 아니라, Studio 범위를 새로 시작하기 위한 독립 스캐폴드입니다.

## 검증 범위

`pnpm test`는 실제 배포 번들을 import해 다음을 확인합니다.

- `alid.extension.json`의 ID·버전·의존성·공개 계약이 런타임 패키지와 일치하고, `dist/plugin.js`의 SHA-256이 manifest와 같은지
- 활성화가 문서를 자동 생성하지 않고, 명령 실행 시에만 `canvas.creation`을 호출하며, 해제가 명령을 회수하는지
- `derive`가 정본을 읽기만 하고 유한한 기하를 반환하는지
- DOM·SVG 렌더가 사용자 텍스트를 이스케이프하고 색상을 검증하는지
- 인스펙터 필드가 모두 선언된 정본 기본값에 속하는지
- 개발 서버가 변경을 감지해 새 SHA-256과 번들을 원자적으로 제공하는지

실제 브라우저에서의 Penrose 렌더링, 한글 IME 조합, 120fps·0-GC 성능은 아직 검증하지 않았습니다. 스캐폴드 단계에서는 이를 달성했다고 주장하지 않습니다.

## 라이선스

[MIT](LICENSE). 이 저장소는 [alid 확장 템플릿](https://github.com/jiwonme/alid-extension-template)에서 시작했습니다.
