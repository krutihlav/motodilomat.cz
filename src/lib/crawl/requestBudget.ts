/** Cokoliv, co umí říct "kolik requestů ještě smím udělat" a zaznamenat spotřebu. */
export interface Budget {
  readonly remaining: number;
  readonly exhausted: boolean;
  consume(n?: number): void;
}

/**
 * Sdílené počítadlo requestů pro jeden běh probe-shops.ts - drží shop pod
 * stropem (viz `max`) i když si o requesty říká několik různých kroků
 * (robots.txt, homepage, feed cesty, sitemapy, produktové stránky).
 */
export class RequestBudget implements Budget {
  private used = 0;

  constructor(private readonly max: number) {}

  get remaining(): number {
    return Math.max(0, this.max - this.used);
  }

  get exhausted(): boolean {
    return this.used >= this.max;
  }

  /** Zaregistruje jeden (nebo `n`) provedený request. */
  consume(n = 1): void {
    this.used += n;
  }

  /**
   * Pohled na tentýž rozpočet, který se považuje za vyčerpaný o `reserve`
   * requestů dřív - použij, když chceš část rozpočtu rezervovat pro
   * následující krok (např. nechat sitemapy sníst maximálně tolik, aby na
   * konci zbylo pár requestů na ověření produktových stránek).
   */
  withReserve(reserve: number): Budget {
    return new ReservedBudgetView(this, reserve);
  }
}

class ReservedBudgetView implements Budget {
  constructor(
    private readonly inner: Budget,
    private readonly reserve: number,
  ) {}

  get remaining(): number {
    return Math.max(0, this.inner.remaining - this.reserve);
  }

  get exhausted(): boolean {
    return this.inner.remaining <= this.reserve;
  }

  consume(n = 1): void {
    this.inner.consume(n);
  }
}
