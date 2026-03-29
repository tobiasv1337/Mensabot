import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import type { ActiveStreamState } from "../../../components/chat/chatStreamState";

const NEAR_BOTTOM_PX = 120;

const isNearBottom = (element: HTMLDivElement) => {
  const remaining = element.scrollHeight - element.scrollTop - element.clientHeight;
  return remaining <= NEAR_BOTTOM_PX;
};

type UseChatScrollStateArgs = {
  chatId: string;
  messagesLength: number;
  version: number;
  isSending: boolean;
  activeStream: ActiveStreamState | null;
  shouldAutoScrollRef: MutableRefObject<boolean>;
  onComposerHeightChange?: (height: number) => void;
};

export const useChatScrollState = ({
  chatId,
  messagesLength,
  version,
  isSending,
  activeStream,
  shouldAutoScrollRef,
  onComposerHeightChange,
}: UseChatScrollStateArgs) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const [showScrollToLatest, setShowScrollToLatest] = useState(false);

  const scrollToBottom = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
  }, []);

  const handleScrollToLatest = useCallback(() => {
    shouldAutoScrollRef.current = true;
    scrollToBottom();
    setShowScrollToLatest(false);
  }, [scrollToBottom, shouldAutoScrollRef]);

  useEffect(() => {
    const node = composerRef.current;
    if (!node) return undefined;

    const reportHeight = () => {
      onComposerHeightChange?.(node.offsetHeight);
    };

    reportHeight();

    const resizeObserver = new ResizeObserver(() => {
      reportHeight();
    });

    resizeObserver.observe(node);
    window.addEventListener("resize", reportHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", reportHeight);
      onComposerHeightChange?.(0);
    };
  }, [onComposerHeightChange]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return undefined;

    const onScroll = () => {
      const nearBottom = isNearBottom(element);
      shouldAutoScrollRef.current = nearBottom;
      setShowScrollToLatest(!nearBottom);
    };

    element.addEventListener("scroll", onScroll, { passive: true });
    shouldAutoScrollRef.current = true;

    return () => element.removeEventListener("scroll", onScroll);
  }, [shouldAutoScrollRef]);

  useEffect(() => {
    if (!shouldAutoScrollRef.current) return;

    requestAnimationFrame(() => {
      scrollToBottom();
    });
  }, [activeStream, chatId, isSending, messagesLength, scrollToBottom, shouldAutoScrollRef, version]);

  useEffect(() => {
    shouldAutoScrollRef.current = true;

    requestAnimationFrame(() => {
      setShowScrollToLatest(false);
      scrollToBottom();
    });
  }, [chatId, scrollToBottom, shouldAutoScrollRef]);

  return {
    composerRef,
    scrollRef,
    showScrollToLatest,
    handleScrollToLatest,
  };
};
