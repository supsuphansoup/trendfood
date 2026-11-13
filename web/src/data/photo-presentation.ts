/** 세로·정사각 실사는 잔·접시 전체를 보존하고 가로 실사는 배너를 채운다. */
export const photoHeroFit = (width: number, height: number): "contain" | "cover" =>
  width / height < 3 / 2 ? "contain" : "cover";
