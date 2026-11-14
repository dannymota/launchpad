"use client";

import { type RefObject, useEffect, useRef } from "react";

/**
 * A ref for a text field that hands over what was typed into it before the page's code ran.
 *
 * A server-rendered form is on screen, and can be typed into, before React attaches to it.
 * On a slow connection that is seconds. Without this the text shows in the field while the
 * state behind it stays empty, so a button that waits for the text never enables.
 *
 *   const [email, setEmail] = useState("");
 *   const field = useEarlyInput(setEmail);
 *   <TextInput ref={field} value={email} onChange={setEmail} ... />
 */
export function useEarlyInput(adopt: (typed: string) => void): RefObject<HTMLInputElement | null> {
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const typed = field.current?.value;
    if (typed) adopt(typed);
  }, [adopt]);
  return field;
}
