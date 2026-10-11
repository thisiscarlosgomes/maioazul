"use client";

import { createLibrary, defineComponent, Renderer } from "@openuidev/react-lang";
import { z } from "zod/v4";

const BusinessMetric = defineComponent({
  name: "BusinessMetric",
  description: "A sourced Maio business statistic with its reference year and caveat.",
  props: z.object({
    label: z.string(),
    value: z.string(),
    year: z.string(),
    source: z.string(),
    caveat: z.string(),
  }),
  component: ({ props }) => (
    <section className="openui-business" aria-label={`${props.label}: ${props.value}`}>
      <span className="openui-business-label">{props.label}</span>
      <strong className="openui-business-value">{props.value}</strong>
      <span className="openui-business-year">{props.year}</span>
      <span className="openui-business-source">{props.source}</span>
      <small className="openui-business-caveat">{props.caveat}</small>
    </section>
  ),
});

const library = createLibrary({ root: "BusinessMetric", components: [BusinessMetric] });

export function OpenUIBusiness({ program }: { program: string }) {
  return <Renderer response={program} library={library} isStreaming={false} />;
}
