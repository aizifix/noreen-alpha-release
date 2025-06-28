export type EventType = "wedding" | "birthday" | "corporate";

export interface EventComponent {
  name: string;
  description: string;
  subComponents: {
    name: string;
    options: string[];
    quantifiable: boolean;
    description: string;
  }[];
}

export interface EventComponents {
  [key: string]: {
    [key: string]: EventComponent[];
  };
}

export interface EventSuppliers {
  [key: string]: {
    [key: string]: string[];
  };
}

export interface EventBundle {
  id: string;
  name: string;
  description: string;
  price: number;
  categories: {
    [key: string]: {
      supplier: string;
      components: string[];
    };
  };
  suitable: EventType[];
  popular: boolean;
}
