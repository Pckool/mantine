import React, { useState, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useDidUpdate, mergeRefs } from '@mantine/hooks';

function getAutoSizeDuration(spanSize: number | string) {
  if (!spanSize || typeof spanSize === 'string') {
    return 0;
  }
  const constant = spanSize / 36;
  return Math.round((4 + 15 * constant ** 0.25 + constant / 5) * 10);
}

export function getElementHeight(
  el: React.RefObject<HTMLElement> | { current?: { scrollHeight: number } }
) {
  return el?.current ? el.current.scrollHeight : 'auto';
}

export function getElementWidth(
  el: React.RefObject<HTMLElement> | { current?: { scrollWidth: number } }
) {
  return el?.current ? el.current.scrollWidth : 'auto';
}

const raf = typeof window !== 'undefined' && window.requestAnimationFrame;

interface UseCollapse {
  opened: boolean;
  transitionDuration?: number;
  transitionTimingFunction?: string;
  onTransitionEnd?: () => void;
  direction?: 'y' | 'x'
}

interface GetCollapseProps {
  [key: string]: unknown;
  style?: React.CSSProperties;
  onTransitionEnd?: (e: TransitionEvent) => void;
  refKey?: string;
  ref?: React.MutableRefObject<HTMLDivElement> | ((node: HTMLDivElement) => void);
}

export function useCollapse({
  transitionDuration,
  transitionTimingFunction = 'ease',
  onTransitionEnd = () => {},
  opened,
  direction='y'
}: UseCollapse): (props: GetCollapseProps) => Record<string, any> {
  const el = useRef<HTMLElement | null>(null);
  const collapsedSize = 0;
  const transitionProp = direction === 'y' ? 'height' : 'width'
  const collapsedStyles = {
    display: 'none',
    height: direction === 'y' ? 0 : undefined,
    width: direction === 'x' ? 0 : undefined,
    overflow: 'hidden',
  };
  const [styles, setStylesRaw] = useState<React.CSSProperties>(opened ? {} : collapsedStyles);
  const setStyles = (newStyles: {} | ((oldStyles: {}) => {})): void => {
    flushSync(() => setStylesRaw(newStyles));
  };

  const mergeStyles = (newStyles: {}): void => {
    setStyles((oldStyles) => ({ ...oldStyles, ...newStyles }));
  };

  function getTransitionStyles(spanSize: number | string): {
    transition: string;
  } {
    const _duration = transitionDuration || getAutoSizeDuration(spanSize);
    return {
      transition: `${transitionProp} ${_duration}ms ${transitionTimingFunction}`,
    };
  }

  useDidUpdate(() => {
    if (opened) {
      raf(() => {
        mergeStyles({ willChange: transitionProp, display: 'block', overflow: 'hidden' });
        raf(() => {
          const size = direction === 'y' ? getElementHeight(el) : getElementWidth(el);
          mergeStyles({ ...getTransitionStyles(size), [transitionProp]: size });
        });
      });
    } else {
      raf(() => {
        const size = direction === 'y' ? getElementHeight(el) : getElementWidth(el);
        mergeStyles({ ...getTransitionStyles(size), willChange: transitionProp, [transitionProp]: size });
        raf(() => mergeStyles({ [transitionProp]: collapsedSize, overflow: 'hidden' }));
      });
    }
  }, [opened]);

  const handleTransitionEnd = (e: React.TransitionEvent): void => {
    if (e.target !== el.current || e.propertyName !== transitionProp) {
      return;
    }

    if (opened) {
      const size = direction === 'y' ? getElementHeight(el) : getElementWidth(el);

      if (size === styles[transitionProp]) {
        setStyles({});
      } else {
        mergeStyles({ [transitionProp]: size });
      }

      onTransitionEnd();
    } else if (styles[transitionProp] === collapsedSize) {
      setStyles(collapsedStyles);
      onTransitionEnd();
    }
  };

  function getCollapseProps({ style = {}, refKey = 'ref', ...rest }: GetCollapseProps = {}) {
    const theirRef: any = rest[refKey];
    return {
      'aria-hidden': !opened,
      ...rest,
      [refKey]: mergeRefs(el, theirRef),
      onTransitionEnd: handleTransitionEnd,
      style: { boxSizing: 'border-box', ...style, ...styles },
    };
  }

  return getCollapseProps;
}
