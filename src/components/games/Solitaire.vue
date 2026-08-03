<template>
  <div class="solitaire-window">
    <div class="solitaire-header">
      <h2>Solitaire</h2>
      <span class="sol-timer"><font-awesome-icon icon="clock" /> {{ timer }}s</span>
      <div class="header-actions">
        <button @click="newGame">New Game</button>
      </div>
    </div>

    <div class="top-row">
      <div class="stock-waste">
        <!-- Shows drawn card face-up; click to select. When empty, shows face-down stock to draw from. -->
        <div
          v-if="waste.length"
          class="top-card waste-card"
          :class="{ selected: selected?.type === 'waste', red: waste[waste.length - 1].color === 'red' }"
          draggable="true"
          @click="selectWaste"
          @dragstart="onDragStart($event, 'waste')"
          @dragend="onDragEnd"
          @pointerdown="onPointerDown($event, 'waste')"
        >
          {{ cardLabel(waste[waste.length - 1]) }}
        </div>
        <div v-else class="top-card stock-card" @click="drawStock">
          {{ stock.length ? `🂠 ${stock.length}` : '↩' }}
        </div>
        <div v-if="waste.length" class="stock-counter" @click="drawStock" title="Draw next card">
          {{ stock.length ? `🂠 ${stock.length}` : '↩' }}
        </div>
      </div>

      <div class="foundations">
        <div
          v-for="suit in suits"
          :key="suit"
          class="foundation"
          :class="{ 'foundation-filled': foundations[suit].length, red: foundations[suit].length && foundations[suit][foundations[suit].length-1].color === 'red' }"
          :data-suit="suit"
          @click="moveToFoundation(suit)"
          @dragover.prevent
          @drop="onDropFoundation($event, suit)"
        >
          <span v-if="foundations[suit].length">{{ cardLabel(foundations[suit][foundations[suit].length - 1]) }}</span>
          <span v-else>{{ suitSymbol(suit) }}</span>
        </div>
      </div>
    </div>

    <div class="tableau-row">
      <div
        v-for="(pile, pileIndex) in tableau"
        :key="pileIndex"
        class="tableau-pile"
        :data-pile-index="pileIndex"
        @click="moveToTableau(pileIndex)"
        @dragover.prevent
        @drop="onDropTableau($event, pileIndex)"
      >
        <div
          v-for="(card, cardIndex) in pile"
          :key="card.id"
          class="card"
          :class="{
            hidden: !card.faceUp,
            red: card.color === 'red',
            selected: isSelectedTableauCard(pileIndex, cardIndex)
          }"
          :style="{ '--card-index': cardIndex }"
          :draggable="card.faceUp"
          @click.stop="onTableauCardTap(pileIndex, cardIndex)"
          @dragstart="card.faceUp && onDragStart($event, 'tableau', pileIndex, cardIndex)"
          @dragend="onDragEnd"
          @pointerdown="card.faceUp && onPointerDown($event, 'tableau', pileIndex, cardIndex)"
        >
          <span v-if="card.faceUp">{{ cardLabel(card) }}</span>
        </div>
      </div>
    </div>

    <p v-if="isWon" class="win-message">You won 🎉</p>

    <!-- Touch-drag ghost: follows the finger while dragging past the threshold.
         Mouse users never see this - onPointerDown bails out for pointerType 'mouse'
         so the native HTML5 drag image is used there instead. -->
    <Teleport to="body">
      <div
        v-if="ghostCard"
        class="solitaire-ghost"
        :class="{ red: ghostCard.color === 'red' }"
        :style="{ left: ghostX + 'px', top: ghostY + 'px' }"
      >
        {{ cardLabel(ghostCard) }}
      </div>
    </Teleport>
  </div>
</template>

<script>
import { unlock as unlockAchievement } from "../../achievements";
const SUITS = ["hearts", "diamonds", "clubs", "spades"];
// Same drag-threshold idiom Desktop.vue uses for icon dragging: below this,
// a touch/pen press is treated as a tap and falls through to the click path.
const DRAG_THRESHOLD = 5;

export default {
  data() {
    return {
      suits: SUITS,
      stock: [],
      waste: [],
      foundations: {
        hearts: [],
        diamonds: [],
        clubs: [],
        spades: [],
      },
      tableau: [[], [], [], [], [], [], []],
      selected: null,
      dragging: null,
      // Touch/pen pointer-drag tracking (mouse keeps using native HTML5 DnD -
      // see onPointerDown). Null when no pointer is currently down.
      pointerDrag: null,
      // Card shown in the floating ghost chip while a touch drag is in progress.
      ghostCard: null,
      ghostX: 0,
      ghostY: 0,
      // Elapsed-time tracking, same idiom as Minesweeper's timer/timerHandle.
      timer: 0,
      timerHandle: null,
      // Swallows the trailing synthetic click that follows a touch drag's
      // pointerup, so the drop doesn't also re-trigger the tap-to-move path.
      justDragged: false,
    };
  },
  computed: {
    isWon() {
      return SUITS.every((suit) => this.foundations[suit].length === 13);
    },
  },
  watch: {
    isWon(value) {
      if (!value) return;
      unlockAchievement("solitaire-won");
      this.stopTimer();
      this.saveWin(this.timer);
    },
  },
  created() {
    this.newGame();
  },
  beforeUnmount() {
    this.stopTimer();
  },
  methods: {
    newGame() {
      const deck = this.createDeck();
      this.shuffle(deck);

      this.foundations = { hearts: [], diamonds: [], clubs: [], spades: [] };
      this.tableau = [[], [], [], [], [], [], []];
      this.waste = [];
      this.selected = null;
      this.stopTimer();
      this.timer = 0;
      this.startTimer();

      let cardIndex = 0;
      for (let i = 0; i < 7; i++) {
        for (let j = i; j < 7; j++) {
          const card = deck[cardIndex++];
          card.faceUp = j === i;
          this.tableau[j].push(card);
        }
      }
      this.stock = deck.slice(cardIndex);
    },
    createDeck() {
      const values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
      const deck = [];
      let id = 0;
      for (const suit of SUITS) {
        for (const value of values) {
          deck.push({
            id: id++,
            suit,
            value,
            color: suit === "hearts" || suit === "diamonds" ? "red" : "black",
            faceUp: false,
          });
        }
      }
      return deck;
    },
    shuffle(array) {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
    },
    drawStock() {
      if (this.stock.length === 0) {
        this.stock = this.waste.reverse().map((c) => ({ ...c, faceUp: false }));
        this.waste = [];
      } else {
        const card = this.stock.pop();
        card.faceUp = true;
        this.waste.push(card);
      }
      this.selected = null;
    },
    selectWaste() {
      if (this.justDragged) return;
      if (this.waste.length) {
        this.selected = { type: "waste" };
      }
    },
    selectTableauCard(pileIndex, cardIndex) {
      const card = this.tableau[pileIndex][cardIndex];
      if (!card.faceUp) return;
      this.selected = { type: "tableau", pileIndex, cardIndex };
    },
    onTableauCardTap(pileIndex, cardIndex) {
      if (this.justDragged) return;
      const isOwnSelection =
        this.selected?.type === "tableau" && this.selected.pileIndex === pileIndex;
      if (this.selected && !isOwnSelection) {
        this.moveToTableau(pileIndex);
        if (this.selected === null) return;
      }
      this.selectTableauCard(pileIndex, cardIndex);
    },
    isSelectedTableauCard(pileIndex, cardIndex) {
      if (!this.selected || this.selected.type !== "tableau") return false;
      return (
        this.selected.pileIndex === pileIndex && this.selected.cardIndex <= cardIndex
      );
    },
    moveToFoundation(suit) {
      if (this.justDragged) return;
      if (!this.selected) return;
      const card = this.getSelectedCard();
      if (!card || card.suit !== suit) return;
      if (!this.canPlaceOnFoundation(card, suit)) return;

      if (this.selected.type === "waste") {
        this.foundations[suit].push(this.waste.pop());
      } else {
        const pile = this.tableau[this.selected.pileIndex];
        if (this.selected.cardIndex !== pile.length - 1) return;
        this.foundations[suit].push(pile.pop());
        this.revealLastTableauCard(this.selected.pileIndex);
      }
      this.selected = null;
    },
    moveToTableau(targetPileIndex) {
      if (this.justDragged) return;
      if (!this.selected) return;

      const targetPile = this.tableau[targetPileIndex];
      const movingCard = this.getSelectedCard();
      if (!movingCard) return;
      if (!this.canPlaceOnTableau(movingCard, targetPile)) return;

      if (this.selected.type === "waste") {
        targetPile.push(this.waste.pop());
      } else {
        const sourcePile = this.tableau[this.selected.pileIndex];
        const movingCards = sourcePile.splice(this.selected.cardIndex);
        this.tableau[targetPileIndex].push(...movingCards);
        this.revealLastTableauCard(this.selected.pileIndex);
      }
      this.selected = null;
    },
    getSelectedCard() {
      if (!this.selected) return null;
      if (this.selected.type === "waste") {
        return this.waste[this.waste.length - 1] || null;
      }
      const pile = this.tableau[this.selected.pileIndex];
      return pile[this.selected.cardIndex] || null;
    },
    canPlaceOnFoundation(card, suit) {
      const foundation = this.foundations[suit];
      if (foundation.length === 0) return card.value === "A";
      const topCard = foundation[foundation.length - 1];
      return this.getValueIndex(card.value) === this.getValueIndex(topCard.value) + 1;
    },
    canPlaceOnTableau(card, pile) {
      if (pile.length === 0) return card.value === "K";
      const topCard = pile[pile.length - 1];
      if (!topCard.faceUp) return false;
      const colorMatch = card.color !== topCard.color;
      const valueMatch = this.getValueIndex(card.value) === this.getValueIndex(topCard.value) - 1;
      return colorMatch && valueMatch;
    },
    getValueIndex(value) {
      const values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
      return values.indexOf(value);
    },
    revealLastTableauCard(pileIndex) {
      const pile = this.tableau[pileIndex];
      if (pile.length > 0) {
        pile[pile.length - 1].faceUp = true;
      }
    },
    cardLabel(card) {
      return `${card.value}${this.suitSymbol(card.suit)}`;
    },
    suitSymbol(suit) {
      const symbols = { hearts: "♥", diamonds: "♦", clubs: "♣", spades: "♠" };
      return symbols[suit];
    },
    startTimer() {
      this.stopTimer();
      const start = Date.now();
      this.timerHandle = setInterval(() => {
        this.timer = Math.floor((Date.now() - start) / 1000);
      }, 1000);
    },
    stopTimer() {
      if (this.timerHandle) {
        clearInterval(this.timerHandle);
        this.timerHandle = null;
      }
    },
    loadWins() {
      try {
        return parseInt(localStorage.getItem("solitaire-wins") || "0", 10);
      } catch (_) {
        return 0;
      }
    },
    loadBestTime() {
      try {
        const v = localStorage.getItem("solitaire-best-time");
        return v === null ? null : parseInt(v, 10);
      } catch (_) {
        return null;
      }
    },
    // Called once, right when a game is won: bumps the win counter and keeps
    // the lower of the previous best time vs this run's time.
    saveWin(elapsedSeconds) {
      try {
        localStorage.setItem("solitaire-wins", String(this.loadWins() + 1));
        const prevBest = this.loadBestTime();
        if (prevBest === null || elapsedSeconds < prevBest) {
          localStorage.setItem("solitaire-best-time", String(elapsedSeconds));
        }
      } catch (_) {}
    },
    onDragStart(event, type, pileIndex = null, cardIndex = null) {
      this.dragging = { type, pileIndex, cardIndex };
      this.selected = { type, pileIndex, cardIndex };
      event.dataTransfer.effectAllowed = 'move';
    },
    onDragEnd() {
      this.dragging = null;
    },
    // Shared validated-move logic used by the mouse HTML5 drop handlers below
    // and by the touch pointer-drag path (onPointerUp) - one implementation
    // of the move rules for all three input paths (mouse drag, touch drag, tap).
    commitDropToTableau(targetPileIndex) {
      if (!this.dragging) return;

      const targetPile = this.tableau[targetPileIndex];
      const movingCard = this.getDraggingCard();
      if (!movingCard || !this.canPlaceOnTableau(movingCard, targetPile)) return;

      if (this.dragging.type === "waste") {
        targetPile.push(this.waste.pop());
      } else {
        const sourcePile = this.tableau[this.dragging.pileIndex];
        const movingCards = sourcePile.splice(this.dragging.cardIndex);
        this.tableau[targetPileIndex].push(...movingCards);
        this.revealLastTableauCard(this.dragging.pileIndex);
      }

      this.selected = null;
    },
    commitDropToFoundation(suit) {
      if (!this.dragging) return;

      const card = this.getDraggingCard();
      if (!card || card.suit !== suit) return;
      if (!this.canPlaceOnFoundation(card, suit)) return;

      if (this.dragging.type === "waste") {
        this.foundations[suit].push(this.waste.pop());
      } else {
        const pile = this.tableau[this.dragging.pileIndex];
        if (this.dragging.cardIndex !== pile.length - 1) return;
        this.foundations[suit].push(pile.pop());
        this.revealLastTableauCard(this.dragging.pileIndex);
      }

      this.selected = null;
    },
    onDropTableau(event, targetPileIndex) {
      this.commitDropToTableau(targetPileIndex);
      this.dragging = null;
    },
    onDropFoundation(event, suit) {
      this.commitDropToFoundation(suit);
      this.dragging = null;
    },
    getDraggingCard() {
      if (!this.dragging) return null;
      if (this.dragging.type === "waste") {
        return this.waste[this.waste.length - 1] || null;
      }
      const pile = this.tableau[this.dragging.pileIndex];
      return pile[this.dragging.cardIndex] || null;
    },
    // --- Touch/pen drag (mouse uses the native HTML5 DnD handlers above) ---
    onPointerDown(event, type, pileIndex = null, cardIndex = null) {
      if (event.pointerType === "mouse") return; // mouse keeps native HTML5 DnD
      if (!event.isPrimary) return; // ignore secondary touches (multi-touch)
      this.pointerDrag = {
        type,
        pileIndex,
        cardIndex,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
      };
      document.addEventListener("pointermove", this.onPointerMove);
      document.addEventListener("pointerup", this.onPointerUp);
    },
    onPointerMove(event) {
      if (!this.pointerDrag || event.pointerId !== this.pointerDrag.pointerId) return;
      const dx = event.clientX - this.pointerDrag.startX;
      const dy = event.clientY - this.pointerDrag.startY;
      if (!this.pointerDrag.moved) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        // Crossed the threshold - commit to a drag, mirroring onDragStart's state
        // so the existing `.selected` highlight and move-validation logic apply.
        this.pointerDrag.moved = true;
        const { type, pileIndex, cardIndex } = this.pointerDrag;
        this.dragging = { type, pileIndex, cardIndex };
        this.selected = { type, pileIndex, cardIndex };
        this.ghostCard = this.getDraggingCard();
      }
      this.ghostX = event.clientX;
      this.ghostY = event.clientY;
      event.preventDefault();
    },
    onPointerUp(event) {
      document.removeEventListener("pointermove", this.onPointerMove);
      document.removeEventListener("pointerup", this.onPointerUp);
      if (!this.pointerDrag || event.pointerId !== this.pointerDrag.pointerId) {
        this.pointerDrag = null;
        return;
      }
      if (this.pointerDrag.moved) {
        const target = document.elementFromPoint(event.clientX, event.clientY);
        const tableauEl = target && target.closest(".tableau-pile");
        const foundationEl = target && target.closest(".foundation");
        if (tableauEl && tableauEl.dataset.pileIndex !== undefined) {
          this.commitDropToTableau(Number(tableauEl.dataset.pileIndex));
        } else if (foundationEl && foundationEl.dataset.suit) {
          this.commitDropToFoundation(foundationEl.dataset.suit);
        }
        this.dragging = null;
        this.ghostCard = null;
        // Swallow the click that touch synthesizes right after pointerup, so
        // the drop doesn't also trigger the tap-to-move path a second time.
        this.justDragged = true;
        setTimeout(() => { this.justDragged = false; }, 0);
      }
      this.pointerDrag = null;
    },
  },
  beforeUnmount() {
    document.removeEventListener("pointermove", this.onPointerMove);
    document.removeEventListener("pointerup", this.onPointerUp);
  },
};
</script>

<style scoped>
.solitaire-window {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  background: linear-gradient(180deg, #276b2d, #1d5b24);
  color: #fff;
  border: 2px solid #000;
}

.solitaire-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.sol-timer {
  opacity: 0.85;
  font-size: 13px;
}

.header-actions button {
  background: #9b20b7;
  border: 1px solid #4f115d;
  color: #fff;
  border-radius: 6px;
  padding: 6px 10px;
  cursor: pointer;
  font-family: inherit;
}

.top-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.stock-waste {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
}

.top-card {
  width: 92px;
  height: 70px;
  background: #f7f7f7;
  color: #111;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 20px;
  cursor: grab;
  flex-shrink: 0;
  text-shadow: none;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
}

.top-card.red {
  color: #b10000;
}

.top-card.selected {
  outline: 2px solid #fff;
  outline-offset: 1px;
}

.stock-card {
  background: #5b0f6f;
  color: #fff;
  cursor: pointer;
}
.stock-counter {
  font-size: 12px;
  color: rgba(255,255,255,0.7);
  cursor: pointer;
  text-align: center;
  padding: 2px 4px;
  border-radius: 4px;
  background: rgba(0,0,0,0.2);
}

.stock-counter:hover {
  background: rgba(0,0,0,0.35);
}

.waste-card {
  position: relative;
  width: 92px;
  height: 70px;
  background: #f7f7f7;
  color: #111;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 20px;
  text-shadow: none;
  cursor: grab;
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
}

.foundations {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.foundation {
  min-width: 92px;
  min-height: 70px;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(155, 32, 183, 0.5);
  border: 2px dashed rgba(255, 255, 255, 0.5);
  border-radius: 6px;
  cursor: pointer;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
}

.foundation-filled {
  background: #f7f7f7;
  border: none;
  color: #111;
  text-shadow: none;
}

.foundation-filled.red {
  color: #b10000;
}

.tableau-row {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(7, minmax(90px, 1fr));
  gap: 10px;
}

.tableau-pile {
  position: relative;
  min-height: 340px;
  border: 1px dashed rgba(255, 255, 255, 0.5);
  border-radius: 6px;
}

.card {
  position: absolute;
  left: 6px;
  right: 6px;
  top: calc(var(--card-index) * 24px);
  height: 70px;
  background: #f7f7f7;
  color: #111;
  border: none;
  border-radius: 4px;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 4px 8px;
  font-weight: bold;
  font-size: 20px;
  text-shadow: none;
  text-shadow: none;
  cursor: grab;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
}

.card:active {
  cursor: grabbing;
}

.card.red {
  color: #b10000;
}

.card.hidden {
  background: repeating-linear-gradient(
    135deg,
    #5b0f6f 0px,
    #5b0f6f 6px,
    #4a0d5c 6px,
    #4a0d5c 8px
  );
  border: 2px solid #3a0944;
  color: transparent;
  cursor: default;
  box-shadow: 0 1px 2px rgba(0,0,0,0.3);
}

.card.selected {
  outline: 2px solid #9b20b7;
  outline-offset: 1px;
}

.win-message {
  text-align: center;
  font-size: 18px;
  font-weight: bold;
}

@media (max-width: 1000px) {
  .tableau-row {
    overflow-x: auto;
    display: flex;
  }

  .tableau-pile {
    min-width: 92px;
  }
}

/* Mobile: fit all 7 tableau columns on screen, tap-to-move (no horizontal scroll) */
/* Also matches touch tablets up to 1200px wide (not just phones) so a
   coarse-pointer device in landscape gets the touch-friendly layout instead
   of falling into the mouse-oriented desktop one. */
@media (max-width: 768px), (pointer: coarse) and (max-width: 1200px) {
  .solitaire-window {
    gap: 6px;
    padding: 6px;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .tableau-row {
    min-height: 0;
  }

  .solitaire-header h2 {
    font-size: 14px;
  }

  .header-actions button {
    padding: 3px 6px;
    font-size: 11px;
  }

  .top-row {
    gap: 6px;
  }

  .stock-waste {
    gap: 4px;
  }

  .top-card,
  .waste-card {
    width: 46px;
    height: 60px;
    font-size: 14px;
    border-radius: 4px;
    touch-action: none;
  }

  .foundations {
    gap: 4px;
  }

  .foundation {
    min-width: 46px;
    min-height: 60px;
    font-size: 14px;
    border-radius: 4px;
  }

  .tableau-row {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
    overflow-x: visible;
    align-items: start;
  }

  .tableau-pile {
    min-width: 0;
    min-height: 60px;
    display: flex;
    flex-direction: column;
  }

  .card {
    position: relative;
    left: 0;
    right: 0;
    top: 0;
    margin-top: -20px;
    height: 32px;
    padding: 2px 3px;
    font-size: 12px;
    border-radius: 3px;
    touch-action: none;
  }

  .tableau-pile .card:first-child {
    margin-top: 0;
  }
}
</style>

<!-- Non-scoped: the drag ghost is teleported to <body>. -->
<style>
.solitaire-ghost {
  position: fixed;
  z-index: 99999;
  width: 92px;
  height: 70px;
  transform: translate(-50%, -50%) scale(1.06);
  background: #f7f7f7;
  color: #111;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: inherit;
  font-weight: bold;
  font-size: 20px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.45);
  pointer-events: none;
}

.solitaire-ghost.red {
  color: #b10000;
}

/* Also matches touch tablets up to 1200px wide (not just phones) so a
   coarse-pointer device in landscape gets the touch-friendly layout instead
   of falling into the mouse-oriented desktop one. */
@media (max-width: 768px), (pointer: coarse) and (max-width: 1200px) {
  .solitaire-ghost {
    width: 46px;
    height: 60px;
    font-size: 14px;
    border-radius: 4px;
  }
}
</style>
