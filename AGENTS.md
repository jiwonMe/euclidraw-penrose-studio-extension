# AGENTS.md — alid 외부 확장 개발 지침

이 저장소는 **alid 앱이나 커널이 아니라, GitHub에서 설치하는 독립 확장 템플릿**이다. 현재 예제는 스티키 노트이며, 공개 `ExtensionPackageSpec` 구조 계약만으로 동작한다. alid 모노레포, Rust/Wasm 빌드, npm SDK 설치 없이 이 저장소 안에서 개발·검증할 수 있어야 한다.

> **작은 코어, 기능은 확장으로. 문서에는 사용자 의도만, 호스트와의 연결은 공개 계약만.**

## 1. 작업 전 읽기

다음 순서로 확인한다.

1. [README.md](README.md): 설치·개발 연결·배포 흐름과 검증 범위.
2. [docs/guide.html](docs/guide.html): 웹으로 읽는 확장 개발 가이드. 패키지 계약·설치 명세·어스펙트·UI·watch·배포를 한 흐름으로 정리한다.
3. [docs/api.md](docs/api.md): 이 예제에서 사용하는 공개 구조 계약과 호스트 서비스.
4. [extension.json](extension.json), [src/manifest.js](src/manifest.js), [src/index.js](src/index.js): 실제 패키지 계약과 구현.
5. 수정할 기능에 해당하는 `scripts/`, `test/`, [CI](.github/workflows/check.yml).

`docs/api.md`는 전체 호스트 API 선언이 아니다. 여기에 없는 기능은 호환되는 호스트의 공개 계약을 확인한 뒤 사용한다. 존재하지 않는 서비스를 추측하거나 호스트 내부 객체·전역 변수·DOM 구조에 기대어 우회하지 않는다. 문서와 구현이 어긋나면 차이를 확인하고, 호환성 판단이 불명확하면 사용자에게 확인한다.

## 2. 파일별 책임과 수정 위치

| 파일 | 책임 / 수정 원칙 |
| --- | --- |
| `extension.json` | 확장 ID·제목·버전·설명·커널 호환 범위·의존성·서비스/HSM 제공 선언의 원본. |
| `src/manifest.js` | 번들과 설치 명세가 공유하는 계약. 현재 `provides.aspects`는 `${metadata.id}.note`로 생성한다. |
| `src/index.js` | 어스펙트·순수 파생·DOM/SVG·선언형 UI·명령·활성화/정리 구현. |
| `scripts/validate-config.mjs` | ID·버전 범위·의존성·제공 선언 검증. 기능을 추가해도 검증을 느슨하게 만들어 통과시키지 않는다. |
| `scripts/install-manifest.mjs` | 설치 API·진입점·SHA256·어스펙트 목록·`capabilities` 생성. |
| `scripts/build.mjs`, `vite.config.js` | 단일 ESM 번들 빌드와 공유 import/출력 파일 검사. |
| `scripts/dev.mjs` | watch 빌드와 로컬 개발 서버. `.alid-dev/`에 출력하며 배포 산출물과 분리한다. |
| `test/*.test.mjs` | 번들 계약·파생·생성·정리·설정 검증·개발 서버 회귀 테스트. |
| `dist/plugin.js`, `alid.extension.json` | **Git에 포함하는 생성 산출물. 직접 편집하지 않고 `pnpm build`로 갱신한다.** |

어스펙트나 명령을 추가·변경하면 런타임 구현만 고치지 말고 공통 계약, 설치 메타데이터, 테스트, API 안내도 함께 확인한다. 현재 `extension.json`의 `provides`에는 `services`와 `hsmSlots`만 허용된다. 어스펙트를 늘리려면 `provides.aspects`를 생성하는 `src/manifest.js`와 설치 명세의 접근 목록도 함께 수정한다.

## 3. 개발·검증 명령

Node.js **22.12 이상**, `package.json`에 고정된 **pnpm 11.22.0**을 사용한다. CI의 Node 버전은 `.github/workflows/check.yml`을 따른다.

```sh
pnpm install --frozen-lockfile
pnpm test          # 배포 번들을 빌드한 뒤 모든 Node 계약 테스트 실행
pnpm check:dist    # 재빌드 후 커밋된 배포 산출물과 차이가 없는지 확인
```

개발 중 호스트에 연결할 때:

```sh
pnpm dev           # 기본 http://127.0.0.1:5174
pnpm test:watch    # 별도 터미널에서 plugin/manifest 테스트 watch
```

- `pnpm dev` 주소를 alid의 **확장 관리 → 개발 중인 확장 연결**에서 명시적으로 승인하고 연결한다. 기본 허용 호스트 출처는 `http://127.0.0.1:5173`, `http://localhost:5173`이다.
- 다른 호스트 출처가 필요하면 `pnpm dev --origin https://alid.example`처럼 정확한 출처를 추가한다. 편의를 위해 서버를 외부에 노출하거나 출처 검사를 제거하지 않는다.
- 개발 번들은 `.alid-dev/`에만 생성된다. `test:watch`의 plugin 테스트는 **`dist/plugin.js`를 읽으며 소스를 빌드하지 않는다.** 최신 소스 검증에는 `pnpm build` 후 watch 테스트를 실행하거나 `pnpm test`를 사용한다.
- 개발 중 ID를 바꾸면 연결을 끊고 다시 연결한다. 같은 ID의 GitHub 설치본과 개발 연결을 동시에 사용하지 않는다.
- 빌드 실패 시 마지막 성공 빌드가 계속 실행된다. 화면이 유지된다고 새 소스가 적용됐다고 판단하지 말고 빌드 번호·오류를 확인한다.

이 저장소에는 별도 `typecheck`나 Rust 테스트 명령이 없다. 존재하지 않는 명령을 완료 검증으로 보고하지 않는다.

## 4. 설치·패키지 계약

- 기본 export는 `ExtensionPackageSpec` 형태의 객체다. 번들과 설치 명세의 `id`, `version`, `engine`, `dependencies`, `optionalDependencies`, `conflicts`, `provides`는 일치해야 한다. 공통 값은 `createPackageManifest()`를 통해 유지한다.
- 설치 형식은 **`apiVersion: 2`**다. `engine`은 커널 호환 범위, `extension.json.version`은 확장 릴리스 버전으로 서로 다르다. 커널 범위만으로 설치 API 지원을 판단하지 않는다.
- 새 확장을 만들 때만 `example.sticky-notes`를 고유 네임스페이스로 바꾼다. 기존 확장을 업데이트하면서 ID를 바꾸지 않는다. 문서 지침만 수정할 때 예제 ID나 릴리스 버전을 불필요하게 바꾸지 않는다.
- 버전과 의존성 범위는 `validate-config.mjs`가 허용하는 정식 SemVer 문법을 사용한다. 프리릴리스·빌드 접미사·하이픈 범위 등을 지원한다고 가정하지 않는다.
- `capabilities`는 실제 어스펙트 읽기/쓰기·서비스·명령 사용 의도를 반영한다. `provides`는 소유권·제공 계약이며 접근 의도 목록과 다르다.
- SHA256을 수동으로 적거나 해시 검사를 끄지 않는다. 설치 명세와 번들은 같은 빌드에서 생성해야 한다.

### 번들 경계

설치 코드는 **Blob URL**에서 실행된다. 출력은 하나의 `dist/plugin.js`이며, 상대 경로 청크·별도 CSS·에셋·런타임 npm 설치에 의존하면 안 된다. 추가 라이브러리는 번들에 포함하고 에셋은 인라인하는 등 단일 파일 계약을 유지한다.

호스트 공유 모듈은 `vite.config.js`의 정확한 목록만 외부화한다.

```text
@alid/kernel, @alid/react,
react, react/jsx-runtime, react/jsx-dev-runtime,
react-dom, react-dom/client
```

호스트의 커널·React를 중복 번들링하거나 내부 `src` 경로를 import하지 않는다. 현재 예제는 SDK import가 필요 없다. React UI가 필요하면 공유 `@alid/react`와 호스트의 루트/포털 계약을 사용하고 별도 React 루트를 만들지 않는다. 공유 SDK import를 도입하면 Node 테스트에서도 해당 모듈을 해석할 대역·로더 구성이 필요하다.

## 5. 문서 정본과 편집 불변식

1. **저장되는 데이터는 사용자 의도뿐이다.** `defaults`와 정본 어스펙트에는 JSON으로 저장 가능한 내용만 둔다. 파생 좌표·DOM 측정값·함수·DOM 노드·타이머·Blob URL·카메라·선택·패널 상태를 저장하지 않는다.
2. **읽기와 활성화는 문서를 바꾸지 않는다.** 설치·API 조회·`derive`·렌더링·화면 열람·개발 리로드·비활성화·제거만으로 객체를 생성·수정·삭제하지 않는다. 쓰기는 사용자의 명시적인 편집 명령에서만 한다.
3. **`derive(props, entityId, view)`는 순수 함수다.** 선언한 정본/파생 입력만 읽고, 입력 객체를 변경하거나 DOM·네트워크에 접근하지 않는다. 누락·잘못된 숫자에는 유한하고 결정론적인 기하를 반환한다.
4. **생성과 속성 편집은 호스트의 단일 Undo를 사용한다.** 생성은 `canvas.creation.create()`에 내용 어스펙트와 유한한 양수 크기를 전달한다. 호스트가 작성하는 `core.transform`·`core.bounds`를 중복 전달하지 않는다. 속성 편집은 어스펙트의 `ui.controls`를 우선 사용한다.
5. **문서는 확장보다 오래 살아야 한다.** 업데이트 시 기존 어스펙트 ID·필드 의미를 유지한다. 가산적 변경을 우선하고, 파괴적인 변경은 새 버전의 어스펙트 ID로 분리한다. 비활성화·제거·리로드에서 기존 객체 데이터를 지우지 않는다.

새 텍스트 필드는 협업 편집용 `textFields`와 검색용 `textSearchFields`를 각각 검토한다. 자체 편집기나 단축키를 추가하면 호스트의 공개 입력 계약을 따르며, 한글/CJK 조합 중 `Enter`·`Escape`·도구 키를 가로채지 않는다. 일반 입력창의 네이티브 Undo·클립보드를 전역 키 리스너로 덮어쓰지 않는다.

## 6. 화면·선택·출판 경계

- **DOM은 안쪽 콘텐츠만 소유한다.** `renderDom(content, ...)`에서 호스트 외곽의 위치·회전·카메라 transform을 수정하지 않는다. 등록한 이벤트·구독은 반환하는 정리 함수로 해제한다.
- **시각 객체에는 순수 `renderSvg`를 함께 제공한다.** 화면 밖이거나 DOM이 한 번도 마운트되지 않아도 정본과 파생값만으로 내보낼 수 있어야 한다. DOM 측정이나 `<foreignObject>`만으로 출판을 대체하지 않는다.
- 사용자 문자열은 DOM/SVG 삽입 시 이스케이프하고 색상 등 속성값도 검증한다. 원문을 `innerHTML`이나 SVG 속성에 그대로 넣지 않는다. 누락값·악성 문자열·유효하지 않은 색상을 회귀 테스트에 포함한다.
- **그리기 순서는 호스트의 단일 Z축이다.** `zOrder`, `layer: 'underlay' | 'overlay'`를 반환하거나 `core.stacking`을 직접 쓰지 않는다. DOM·SVG·선택 판정·공간 인덱스의 순위를 확장이 별도로 관리하지 않는다.
- 일반 박스는 `core.transform`·`core.bounds`를 사용한다. 자동 크기 객체는 공개 `layout` 계약을, 박스 없는 선형 객체는 `paintBounds(derived)`의 월드 박스를 검토한다. 화면 컬링·전체 보기에서 누락되지 않아야 한다.
- 회전은 라디안이다. DOM 콘텐츠의 로컬 좌표와 SVG 출판의 월드 변환을 혼동하지 않는다.

생성 버튼은 설치 단위 `ui.controls`의 `tool-shelf` action으로 기여한다. `commandSymbol`을 등록한 명령 ID와 맞추고, 선택 없이 생성해야 하면 `requiresSelection: false`를 선언한다. 속성 컨트롤은 해당 어스펙트의 `defaults`에 존재하는 필드를 가리켜야 한다. 호스트 툴바·인스펙터 DOM을 직접 수정하지 않는다.

## 7. 활성화·정리·확장 간 연결

- `activate(context)`는 정리 함수 또는 `{ api, dispose }`를 반환할 수 있다. 아무 자원도 만들지 않으면 반환값을 생략할 수 있다. 명령·이벤트·타이머·옵서버·구독·비동기 작업을 만들었다면 생성의 역순으로 정리한다.
- 비활성화·리로드 후의 오래된 API가 문서를 바꾸지 않도록 하고, 폐기한 자원을 다음 활성화에서 재사용하지 않는다. 진행 중 비동기 작업은 중단하거나 완료 시 활성 상태를 확인한다. 여러 자원을 등록하다 실패하면 이미 등록한 자원도 정리한다.
- 명령 ID는 `namespace:name` 형태로 만들고, 제목·설명·실행 콜백을 함께 등록한다. 캔버스 명령은 적절한 `shortcutScope`를 지정한다. 전역 이벤트 리스너 대신 명령 등록표를 사용한다.
- `dependencies`·`optionalDependencies`의 키는 **npm 이름이나 GitHub 주소가 아니라 alid 논리 확장 ID**다. 선언만으로 다른 저장소를 다운로드하지 않는다.
- 다른 확장은 직접 선언한 공급자의 `getExtensionApi(id)` / `requireExtensionApi(id)` 또는 공개 서비스 계약으로만 연결한다. 호스트 서비스인 `canvas.creation`은 확장 의존성으로 적지 않는다.
- 선택 공급자는 없거나 꺼져도 동작해야 한다. 호출 시 API 가용성을 확인하고, 리로드된 공급자의 오래된 API를 영구 캐시하지 않는다. 직접 서비스를 제공하면 `provides.services`에 선언한다.

이 템플릿은 **승인 후 앱 안에서 실행되는 신뢰 확장**이다. 의존성 검증과 `capabilities`를 DOM·네트워크를 격리하는 보안 샌드박스라고 설명하지 않는다. GitHub 조회는 실행과 분리되며, 업데이트나 개발 연결에서도 사용자 승인·무결성·출처 검사를 우회하지 않는다.

## 8. 완료 전 확인

- [ ] 요청 범위만 수정했고 기존 문서의 ID·스키마·데이터를 보존했는가?
- [ ] 기능 변경에 맞는 `test/*.test.mjs` 회귀 테스트와 필요한 README/API 안내를 갱신했는가?
- [ ] `pnpm test`를 실행해 실제 배포 번들·설치 계약·해시를 검증했는가?
- [ ] 소스 변경으로 생성된 `dist/plugin.js`, `alid.extension.json`을 함께 포함하고 `pnpm check:dist`가 통과하는가?
- [ ] 활성화만으로 문서를 쓰지 않고, 명시적 편집과 정리·재활성화가 기대대로 동작하는가?
- [ ] 시각 변경은 DOM 없이도 SVG를 만들며 사용자 입력을 안전하게 출력하는가?

코드 변경 시 가능하면 호스트에서 **설치 또는 개발 연결 → 생성 → 선택·이동·리사이즈 → 속성 편집 → Undo/Redo → 화면 밖 객체 SVG 내보내기 → 비활성화/재활성화·리로드**를 확인한다. 텍스트 입력을 추가했다면 한글 IME도 확인한다. 개발 서버를 수정했다면 재빌드·실패 복구·reload 이벤트·출처 제한 테스트를 유지한다.

Node 테스트는 모의 호스트와 생성 번들의 계약 검증이지 실제 브라우저·IME·Loro Undo 통합 검증이 아니다. 완료 보고에는 **실행한 명령과 결과, 수동 확인 여부, 미검증 범위**를 구분한다. 문서만 수정했으면 런타임 검증의 적용 여부를 명시한다. 계측 없이 1,000개 객체의 120fps·핫패스 0-GC 또는 모든 호스트 호환성을 달성했다고 주장하지 않는다.
