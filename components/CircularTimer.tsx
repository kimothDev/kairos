/**
 * Circular Timer
 *
 * The main timer component featuring a circular progress ring,
 * live countdown, and interactive controls for the focus session.
 */
import {
    SPACING
} from "@/constants/layout";
import {
    ADHD_FOCUS_OPTIONS,
    FOCUS_OPTIONS,
    formatTime,
} from "@/constants/timer";
import { useThemeColor } from "@/hooks/useThemeColor";
import useTimerStore from "@/store/timerStore";
import { Play, SkipForward, X } from "lucide-react-native";
import React, { useEffect, useMemo, useRef } from "react";
import {
    Animated,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from "react-native";
import Svg, { Circle as SvgCircle } from "react-native-svg";
import InlineTimePicker from "./InlineTimePicker";

const AnimatedCircle = Animated.createAnimatedComponent(SvgCircle);

export default function CircularTimer() {
  const colors = useThemeColor();
  const { width: windowWidth } = useWindowDimensions();

  // Responsive Dimensions
  const RADIUS = Math.min(windowWidth * 0.4, 180); // Cap at 180 for tablets
  const STROKE_WIDTH = 12;
  const INNER_RADIUS = RADIUS - STROKE_WIDTH / 2;
  const CIRCUMFERENCE = 2 * Math.PI * INNER_RADIUS;

  // Font sizes & Dimensions scaled to circle
  const TIME_FONT_SIZE = RADIUS * 0.4;
  const PICKER_FONT_SIZE = RADIUS * 0.5; // Larger font
  const UNIT_FONT_SIZE = RADIUS * 0.2;
  const PICKER_ITEM_HEIGHT = PICKER_FONT_SIZE * 2.0; // Increased spacing
  const PICKER_WIDTH = RADIUS * 1.5; // Reduced width to allow label to sit next to it
  const PICKER_HEIGHT = RADIUS * 1.8; // Tall enough for nice curve

  const {
    sessionStartTimestamp,
    initialTime,
    isActive,
    showTimeAdjust,
    showCancel,
    showSkip,
    startTimer,
    cancelTimer,
    skipTimer,
    toggleTimeAdjust,
    adjustTime,
    setTime,
    getLiveTime,
    userAcceptedRecommendation,
    includeShortSessions,
  } = useTimerStore();

  const [, forceRender] = React.useReducer((x) => x + 1, 0);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const isFirstRender = useRef(true);

  useEffect(() => {
    const timerStore = useTimerStore.getState();
    const interval = setInterval(() => {
      timerStore.restoreTimerState();
      forceRender();
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const time = getLiveTime();

  const progress = React.useMemo(() => {
    if (!initialTime || initialTime <= 0) return 0;
    const ratio = 1 - time / initialTime;
    return Math.min(Math.max(ratio, 0), 1);
  }, [time, initialTime]);

  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: progress,
      duration: isFirstRender.current ? 0 : 200,
      useNativeDriver: false,
    }).start(() => {
      isFirstRender.current = false;
    });
  }, [progress]);

  const pickerOptions = useMemo(() => {
    const opts = includeShortSessions ? ADHD_FOCUS_OPTIONS : FOCUS_OPTIONS;
    return opts.map((opt) => ({
      label: opt.label.replace("minutes", "min"),
      value: opt.duration,
    }));
  }, [includeShortSessions]);

  const handleStartPause = () => {
    startTimer();
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };
  const label = formatTime(time);
  const display = label.includes("NaN") ? "00:00" : label;

  return (
    <View style={styles.timerContainer}>
      <Animated.View
        style={[
          styles.circularProgress,
          {
            width: RADIUS * 2,
            height: RADIUS * 2,
            borderRadius: RADIUS,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={[styles.circleContainer, { borderRadius: RADIUS }]}>
          <View
            style={[
              styles.circleContent,
              {
                width: RADIUS * 2,
                height: RADIUS * 2,
                borderRadius: RADIUS,
                overflow: "hidden",
              },
            ]}
          >
            <View style={styles.timeAdjustContainer}>
              {(!isActive && !userAcceptedRecommendation) || showTimeAdjust ? (
                showTimeAdjust ? (
                  <View
                    style={{
                      width: RADIUS * 2,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <View style={styles.pickerWithLabel}>
                      <InlineTimePicker
                        options={pickerOptions}
                        selectedValue={time}
                        onValueChange={(val) => setTime(val)}
                        onConfirm={() =>
                          useTimerStore.setState({ showTimeAdjust: false })
                        }
                        width={PICKER_WIDTH}
                        height={PICKER_HEIGHT}
                        fontSize={PICKER_FONT_SIZE}
                      />
                      <Text
                        style={[
                          styles.staticLabel,
                          {
                            position: "absolute",
                            left: "60%",
                            marginLeft: 10,
                            color: colors.text.secondary,
                            fontSize: UNIT_FONT_SIZE,
                            fontWeight: "500",
                            opacity: 0.8,
                          },
                        ]}
                      >
                        min
                      </Text>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => {
                      const store = useTimerStore.getState();
                      if (!store.taskType || !store.energyLevel) {
                        store.showThemedAlert(
                          "Customise Timer",
                          "Please select both a task type and focus mood before customizing the timer.",
                        );
                        return;
                      }
                      if (
                        !store.hasInteractedWithTimer &&
                        !store.userAcceptedRecommendation &&
                        !store.hasDismissedRecommendationCard
                      ) {
                        useTimerStore.setState({
                          userAcceptedRecommendation: false,
                          hasInteractedWithTimer: true,
                        });
                      }
                      toggleTimeAdjust();
                    }}
                    style={styles.timeTextContainer}
                  >
                    <Text
                      style={[
                        styles.timeText,
                        {
                          color: colors.text.primary,
                          fontSize: TIME_FONT_SIZE,
                        },
                      ]}
                    >
                      {display}
                    </Text>
                  </TouchableOpacity>
                )
              ) : (
                <View style={styles.timeTextContainer}>
                  <Text
                    style={[
                      styles.timeText,
                      { color: colors.text.primary, fontSize: TIME_FONT_SIZE },
                    ]}
                  >
                    {display}
                  </Text>
                </View>
              )}
            </View>

            {!isActive && !showTimeAdjust ? (
              <TouchableOpacity
                onPress={handleStartPause}
                style={[
                  styles.startPauseButton,
                  {
                    backgroundColor: colors.card,
                    borderWidth: 1,
                    borderColor: colors.border,
                    marginTop: RADIUS * 0.15,
                    width: RADIUS * 0.45,
                    height: RADIUS * 0.45,
                    borderRadius: (RADIUS * 0.45) / 2,
                  },
                ]}
              >
                <Play size={RADIUS * 0.2} color={colors.secondary} />
              </TouchableOpacity>
            ) : !isActive && showTimeAdjust ? null : showCancel ? (
              <TouchableOpacity
                onPress={cancelTimer}
                style={[
                  styles.startPauseButton,
                  styles.cancelButton,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.secondary,
                    marginTop: RADIUS * 0.15,
                    width: RADIUS * 0.35,
                    height: RADIUS * 0.35,
                    borderRadius: (RADIUS * 0.35) / 2,
                  },
                ]}
              >
                <X size={RADIUS * 0.18} color={colors.secondary} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={skipTimer}
                style={[
                  styles.startPauseButton,
                  styles.skipButton,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.primary,
                    marginTop: RADIUS * 0.15,
                    width: RADIUS * 0.35,
                    height: RADIUS * 0.35,
                    borderRadius: (RADIUS * 0.35) / 2,
                  },
                ]}
              >
                <SkipForward size={RADIUS * 0.18} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>

          <Svg
            width={RADIUS * 2}
            height={RADIUS * 2}
            style={{ position: "absolute", pointerEvents: "none" }}
          >
            <SvgCircle
              cx={RADIUS}
              cy={RADIUS}
              r={INNER_RADIUS}
              stroke={colors.border}
              strokeWidth={STROKE_WIDTH}
              fill="none"
            />
            <AnimatedCircle
              cx={RADIUS}
              cy={RADIUS}
              r={INNER_RADIUS}
              stroke={colors.primary}
              strokeWidth={STROKE_WIDTH}
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={animatedProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [CIRCUMFERENCE, 0],
              })}
              strokeLinecap="round"
              fill="none"
              rotation="-90"
              originX={RADIUS}
              originY={RADIUS}
            />
          </Svg>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  timerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  circularProgress: {
    overflow: "hidden",
  },
  circleContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden", // Enforce clipping
  },
  circleContent: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  timeText: {
    fontFamily: "Outfit_700Bold",
    marginBottom: SPACING.p2,
  },
  startPauseButton: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  timeAdjustContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  timeTextContainer: {
    paddingVertical: SPACING.xs,
    padding: SPACING.sm,
    marginVertical: -5,
  },
  timeAdjustButton: {
    padding: SPACING.xs,
    marginVertical: -10,
  },
  cancelButton: {
    borderWidth: 2,
  },
  skipButton: {
    borderWidth: 2,
  },
  pickerWithLabel: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  staticLabel: {
    fontFamily: "Outfit_600SemiBold",
    marginLeft: 0,
  },
});
