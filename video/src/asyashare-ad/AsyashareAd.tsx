import { AbsoluteFill, Sequence } from "remotion";
import { Opening } from "./Opening";
import { ScreenBeat } from "./ScreenBeat";
import { FeedScreen } from "./FeedScreen";
import { SpecialistScreen } from "./SpecialistScreen";
import { Outro } from "./Outro";

export const AD_FPS = 30;
export const AD_DURATION = 450; // 15s @ 30fps

const OPENING = 75;
const BEAT_1 = 150;
const BEAT_2 = 135;
const OUTRO = AD_DURATION - OPENING - BEAT_1 - BEAT_2;

export const AsyashareAd: React.FC = () => {
  return (
    <AbsoluteFill style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <Sequence durationInFrames={OPENING}>
        <Opening />
      </Sequence>

      <Sequence from={OPENING} durationInFrames={BEAT_1}>
        <ScreenBeat
          screen={<FeedScreen />}
          calloutText="Verified specialists only."
          durationInFrames={BEAT_1}
        />
      </Sequence>

      <Sequence from={OPENING + BEAT_1} durationInFrames={BEAT_2}>
        <ScreenBeat
          screen={<SpecialistScreen />}
          calloutText="Real cases. Real discussion."
          durationInFrames={BEAT_2}
        />
      </Sequence>

      <Sequence from={OPENING + BEAT_1 + BEAT_2} durationInFrames={OUTRO}>
        <Outro />
      </Sequence>
    </AbsoluteFill>
  );
};
