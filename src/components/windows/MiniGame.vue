<template>
<<<<<<< Updated upstream
  <div class="clicker-game">
    <h2>{{ $t('clickTheRick') }}</h2>
    <p>{{ $t('score') }}: {{ clickerScore }}</p>
    <img
      src="/src/assets/img/minigame.webp"
      alt="Click Me"
      class="clicker-image"
      @click="incrementScore"
    />
    <div class="upgrades">
      <h3>{{ $t('upgrades') }}</h3>
      <div class="upgrade" v-for="(upgrade, index) in upgrades" :key="index">
        <p>{{ upgrade.name }}</p>
        <p>{{ $t('cost') }}: {{ upgrade.cost }}</p>
        <p v-if="upgrade.multiplier">{{ $t('nextMultiplier') }}: x{{ upgrade.multiplier }}</p>
        <p v-if="upgrade.autoClick">{{ $t('autoClicks') }}: +{{ upgrade.autoClick }}/{{ $t('sec') }}</p>
        <button
          :disabled="clickerScore < upgrade.cost"
          @click="purchaseUpgrade(index)"
        >
          {{ $t('buy') }}
        </button>
      </div>
    </div>
=======
  <div class="solitaire-window">
    <div class="solitaire-header">
      <h2>Solitaire</h2>
      <div class="header-actions">
        <button @click="newGame">New Game</button>
        <button @click="drawStock">Draw</button>
      </div>
    </div>

    <div class="top-row">
      <div class="stock-waste">
        <button class="pile stock" @click="drawStock">
          {{ stock.length ? `Stock (${stock.length})` : 'Recycle' }}
        </button>

        <div class="waste-area">
          <div
            v-if="waste.length"
            class="card waste-card"
            :class="{ 
              selected: selected?.type === 'waste',
              red: waste[waste.length - 1].color === 'red'
            }"
            draggable="true"
            @click="selectWaste"
            @dragstart="onDragStart($event, 'waste')"
            @dragend="onDragEnd"
          >
            {{ cardLabel(waste[waste.length - 1]) }}
          </div>
          <div v-else class="pile waste-empty">Waste</div>
        </div>
      </div>

      <div class="foundations">
        <div
          v-for="suit in suits"
          :key="suit"
          class="pile foundation"
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
          :style="{ top: `${cardIndex * 24}px` }"
          :draggable="card.faceUp"
          @click.stop="selectTableauCard(pileIndex, cardIndex)"
          @dragstart="card.faceUp && onDragStart($event, 'tableau', pileIndex, cardIndex)"
          @dragend="onDragEnd"
        >
          <span v-if="card.faceUp">{{ cardLabel(card) }}</span>
        </div>
      </div>
    </div>

    <p v-if="isWon" class="win-message">You won 🎉</p>
>>>>>>> Stashed changes
  </div>
</template>

<script>
export default {
  data() {
    return {
<<<<<<< Updated upstream
      clickerScore: 0,
      upgrades: [
        { name: this.$t('doubleClicks'), cost: 10, multiplier: 2 },
        { name: this.$t('autoClicker'), cost: 50, autoClick: 1 },
      ],
      pointsPerClick: 1,
      autoClickInterval: null,
=======
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
>>>>>>> Stashed changes
    };
  },
  methods: {
    incrementScore() {
      this.clickerScore += this.pointsPerClick;
    },
    purchaseUpgrade(index) {
      const upgrade = this.upgrades[index];
      if (this.clickerScore >= upgrade.cost) {
        this.clickerScore -= upgrade.cost;
        if (upgrade.multiplier) {
          this.pointsPerClick *= upgrade.multiplier;
        }
        if (upgrade.autoClick) {
          this.startAutoClicker(upgrade.autoClick);
        }
      }
    },
    startAutoClicker(autoClickRate) {
      if (this.autoClickInterval) {
        clearInterval(this.autoClickInterval);
      }
      this.autoClickInterval = setInterval(() => {
        this.clickerScore += autoClickRate;
      }, 1000);
    },
    onDragStart(event, type, pileIndex = null, cardIndex = null) {
      this.dragging = { type, pileIndex, cardIndex };
      this.selected = { type, pileIndex, cardIndex };
      event.dataTransfer.effectAllowed = 'move';
    },
    onDragEnd() {
      this.dragging = null;
    },
    onDropTableau(event, targetPileIndex) {
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
      this.dragging = null;
    },
    onDropFoundation(event, suit) {
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
  },
  beforeUnmount() {
    if (this.autoClickInterval) {
      clearInterval(this.autoClickInterval);
    }
  },
};
</script>
<<<<<<< Updated upstream
=======

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

.header-actions button,
.pile {
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

.stock-waste,
.foundations {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.pile {
  min-width: 92px;
  min-height: 70px;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.waste-area {
  min-width: 92px;
  min-height: 70px;
  display: flex;
  align-items: flex-start;
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
}

.waste-card:active {
  cursor: grabbing;
}

.waste-card.red {
  color: #b10000;
}

.waste-card.selected {
  outline: 2px solid #fff;
  outline-offset: 1px;
}

.waste-empty {
  min-width: 92px;
  min-height: 70px;
  background: #9b20b7;
  border: 1px solid #4f115d;
  color: #fff;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.waste.selected {
  box-shadow: 0 0 0 2px #fff inset;
}

.foundation {
  background: rgba(155, 32, 183, 0.5);
  border: 2px dashed rgba(255, 255, 255, 0.5);
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
  cursor: grab;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}

.card:active {
  cursor: grabbing;
}

.card.red {
  color: #b10000;
}

.card.hidden {
  background: #5b0f6f;
  border-color: #2a0734;
  color: transparent;
  cursor: default;
  box-shadow: none;
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
</style>
>>>>>>> Stashed changes
