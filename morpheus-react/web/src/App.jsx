import reactLogo from "@/assets/react.svg";
import viteLogo from "/vite.svg";
import "@/App.css";

import { picker } from "@morpheus/addon-media";
import { uploadHttp } from "@morpheus/addon-netext";
import { useState } from "react";

function App() {
  const [previewUrl, setPreviewUrl] = useState("");
  async function onClickButton() {
    // todo: upload
    // 1. 앨범에서 이미지 정보 가져오기
    const image = await picker({ mediaType: "ALL" });
    if (image) {
      const file = image.path; // 타겟 파일
      // 2. 파일을 업로드하기
      const res = await uploadHttp({
        url: "http://10.0.2.2:5173/file/upload",
        body: [{ name: "file", type: "FILE", content: file }],
      });

      if (res.code == 200) {
        // 3. 응답받은  URL을 통해서 미리보기를 제공하기.
        const data = JSON.parse(res.body);
        setPreviewUrl(data.path);
      }
    }
  }
  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={onClickButton}>파일 업로드 테스트</button>
        {previewUrl && <img src={previewUrl} alt="" />}
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  );
}

export default App;
