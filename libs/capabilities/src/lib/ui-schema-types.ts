export type UISchema =
  | {
      type: "container";
      children: UISchema[];
    }
  | {
      type: "feature";
      key: string;
    }
  | {
      type: "component";
      name: string;
      props?: Record<string, unknown>;
    };
