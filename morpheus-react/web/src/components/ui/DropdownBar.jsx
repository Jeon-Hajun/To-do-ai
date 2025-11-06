import React, { useRef, useEffect, useState } from "react";

export default function DropdownBar({ items = [], title }) {
  const [open, setOpen] = useState(false);
  const barRef = useRef();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (barRef.current && !barRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={barRef} className="relative w-full">
      {/* 메뉴 버튼 오른쪽 끝 */}
      <div className="flex justify-end">
        <button
          onClick={() => setOpen((prev) => !prev)}
          className="p-3 text-2xl rounded-md hover:bg-gray-200 transition"
        >
          ☰
        </button>
      </div>

      {/* 헤더 바로 아래로 내려오는 바 */}
      <div
        className={`overflow-hidden transition-all duration-300 ${
          open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        {/* 화면 중앙 정렬 */}
        <div className="w-full flex justify-center px-4">
          <div className="flex flex-col items-center w-full max-w-full sm:max-w-lg md:max-w-2xl lg:max-w-3xl">
            {/* 드롭다운 타이틀 */}
            {title && <div className="text-lg font-bold py-1">{title}</div>}

            {/* 메뉴 아이템 */}
            <div className="flex flex-col items-center w-full px-4">
              {items.map((item, idx) => (
                <button
                  key={idx}
                  onClick={item.onClick}
                  className="w-full py-1.5 mb-5 text-base font-medium hover:bg-gray-100 rounded-md transition"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
