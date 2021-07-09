module.exports = {
  defaultConfig: {
    enabled: true,
	showAllUpgrades: false
  },
	defaultConfigDetails: {
    showAllUpgrades: {label: 'Show all upgrades?'}
  },
  pluginName: 'RuneDropEfficiency2',
  pluginDescription: 'Logs the maximum possible efficiency for runes as they drop and all upgrades',
  init(proxy, config) {
    proxy.on('apiCommand', (req, resp) => {
      if (config.Config.Plugins[this.pluginName].enabled) {
        this.processCommand(proxy, req, resp, config);
      }
    });
  },
  processCommand(proxy, req, resp, config) {
    const { command } = req;
    let runesInfo = [];

    // Extract the rune and display it's efficiency stats.
    switch (command) {
      case 'BattleDungeonResult':
      case 'BattleScenarioResult':
      case 'BattleDimensionHoleDungeonResult':
        if (resp.win_lose === 1) {
          const reward = resp.reward ? resp.reward : {};

          if (reward.crate && reward.crate.rune) {
            runesInfo.push(this.logRuneDrop(reward.crate.rune));
          }
        }
        break;
      case 'BattleDungeonResult_V2':
        if (resp.win_lose === 1) {
          const rewards = resp.changed_item_list ? resp.changed_item_list : [];

          if (rewards) {
            rewards.forEach(reward => {
              if (reward.type === 8) {
                runesInfo.push(this.logRuneDrop(reward.info));
              }
            });
          }
        }
        break;
      case 'UpgradeRune': {
		  
		 if (config.Config.Plugins[this.pluginName].showAllUpgrades) {
			 runesInfo.push(this.logRuneDrop(resp.rune));
		 } else {
			const originalLevel = req.upgrade_curr;
			const newLevel = resp.rune.upgrade_curr;

			if (newLevel > originalLevel && newLevel % 3 === 0 && newLevel <= 12) {
			  runesInfo.push(this.logRuneDrop(resp.rune));
			}
		 }
        break;
      }
      case 'AmplifyRune':
      case 'AmplifyRune_v2':
      case 'ConvertRune':
      case 'ConvertRune_v2':
      case 'ConfirmRune':
        runesInfo.push(this.logRuneDrop(resp.rune));
        break;

      case 'BuyBlackMarketItem':
        if (resp.runes && resp.runes.length === 1) {
          runesInfo.push(this.logRuneDrop(resp.runes[0]));
        }
        break;

      case 'BuyGuildBlackMarketItem':
        if (resp.runes && resp.runes.length === 1) {
          runesInfo.push(this.logRuneDrop(resp.runes[0]));
        }
        break;

      case 'BuyShopItem':
        if (resp.reward && resp.reward.crate && resp.reward.crate.runes) {
          runesInfo.push(this.logRuneDrop(resp.reward.crate.runes[0]));
        }
        break;

      case 'GetBlackMarketList':
        resp.market_list.forEach(item => {
          if (item.item_master_type === 8 && item.runes) {
            runesInfo.push(this.logRuneDrop(item.runes[0]));
          }
        });
        break;

      case 'GetGuildBlackMarketList':
        resp.market_list.forEach(item => {
          if (item.item_master_type === 8 && item.runes) {
            runesInfo.push(this.logRuneDrop(item.runes[0]));
          }
        });
        break;

      case 'BattleWorldBossResult': {
        const reward = resp.reward ? resp.reward : {};

        if (reward.crate && reward.crate.runes) {
          reward.crate.runes.forEach(rune => {
            runesInfo.push(this.logRuneDrop(rune));
          });
        }
        break;
      }
      case 'BattleRiftDungeonResult':
        if (resp.item_list) {
          resp.item_list.forEach(item => {
            if (item.type === 8) {
              runesInfo.push(this.logRuneDrop(item.info));
            }
          });
        }
        break;

      default:
        break;
    }

    if (runesInfo.length > 0) {
      proxy.log({
        type: 'info',
        source: 'plugin',
        name: this.pluginName,
        message: this.mountRuneListHtml(runesInfo)
      });
    }
  },

  logRuneDrop(rune) {
    const efficiency = this.getRuneEfficiency(rune);
    const runeQuality = gMapping.rune.quality[rune.rank];
    const colorTable = {
      Common: 'grey',
      Magic: 'green',
      Rare: 'blue',
      Hero: 'purple',
      Legend: 'orange'
    };

    let color = colorTable[runeQuality];
    let starHtml = this.mountStarsHtml(rune);

    return `<div class="rune item">
              <div class="ui image ${color} label">
                <img src="../assets/runes/${this.rune.sets[rune.set_id]}.png" />
                <span class="upgrade">+${rune.upgrade_curr}</span>  
              </div>

              <div class="content">
                ${starHtml}
                <div class="header">${gMapping.isAncient(rune) ? 'Ancient ' : ''}${gMapping.rune.sets[rune.set_id]} Rune (${rune.slot_no}) ${
      gMapping.rune.effectTypes[rune.pri_eff[0]]}: ${this.rune.quality[rune.extra]}</div>
                <div class="description">Efficiency: ${efficiency.current}%. Max:${efficiency.max}%. </div>
				<div class="description">Hero Grinded:${efficiency.maxHeroGrinded}%. Legend Grinded:${efficiency.maxLegendGrinded}%.</div>
              </div>
            </div>`;
  },

  mountStarsHtml(rune) {
    let count = 0;
    let html = '<div class="star-line">';
    let runeClass = gMapping.isAncient(rune) ? rune.class - 10 : rune.class;
    while (count < runeClass) {
      html = html.concat('<span class="star"><img src="../assets/icons/star-unawakened.png" /></span>');
      count += 1;
    }

    return html.concat('</div>');
  },

  mountRuneListHtml(runes) {
    let message = '<div class="runes ui list relaxed">';

    runes.forEach(rune => {
      message = message.concat(rune);
    });

    return message.concat('</div>');
  },

  rune: {
    effectTypes: {
      0: '',
      1: 'HP flat',
      2: 'HP%',
      3: 'ATK flat',
      4: 'ATK%',
      5: 'DEF flat',
      6: 'DEF%',
      8: 'SPD',
      9: 'CRate',
      10: 'CDmg',
      11: 'RES',
      12: 'ACC'
    },
    sets: {
      1: 'Energy',
      2: 'Guard',
      3: 'Swift',
      4: 'Blade',
      5: 'Rage',
      6: 'Focus',
      7: 'Endure',
      8: 'Fatal',
      10: 'Despair',
      11: 'Vampire',
      13: 'Violent',
      14: 'Nemesis',
      15: 'Will',
      16: 'Shield',
      17: 'Revenge',
      18: 'Destroy',
      19: 'Fight',
      20: 'Determination',
      21: 'Enhance',
      22: 'Accuracy',
      23: 'Tolerance',
      99: 'Immemorial'
    },
    class: {
      0: 'Common',
      1: 'Magic',
      2: 'Rare',
      3: 'Hero',
      4: 'Legendary'
    },
    quality: {
      1: 'Common',
      2: 'Magic',
      3: 'Rare',
      4: 'Hero',
      5: 'Legend',
      // ancient rune qualities
      11: 'Common',
      12: 'Magic',
      13: 'Rare',
      14: 'Hero',
      15: 'Legend'
    },
    mainstat: {
      1: {
        max: {
          1: 804,
          2: 1092,
          3: 1380,
          4: 1704,
          5: 2088,
          6: 2448
        }
      },
      2: {
        max: {
          1: 18,
          2: 20,
          3: 38,
          4: 43,
          5: 51,
          6: 63
        }
      },
      3: {
        max: {
          1: 54,
          2: 74,
          3: 93,
          4: 113,
          5: 135,
          6: 160
        }
      },
      4: {
        max: {
          1: 18,
          2: 20,
          3: 38,
          4: 43,
          5: 51,
          6: 63
        }
      },
      5: {
        max: {
          1: 54,
          2: 74,
          3: 93,
          4: 113,
          5: 135,
          6: 160
        }
      },
      6: {
        // Defense
        max: {
          1: 18,
          2: 20,
          3: 38,
          4: 43,
          5: 51,
          6: 63
        }
      },
      8: {
        max: {
          1: 18,
          2: 19,
          3: 25,
          4: 30,
          5: 39,
          6: 42
        }
      },
      9: {
        max: {
          1: 18,
          2: 20,
          3: 37,
          4: 41,
          5: 47,
          6: 58
        }
      },
      10: {
        max: {
          1: 20,
          2: 37,
          3: 43,
          4: 58,
          5: 65,
          6: 80
        }
      },
      11: {
        max: {
          1: 18,
          2: 20,
          3: 38,
          4: 44,
          5: 51,
          6: 64
        }
      },
      12: {
        max: {
          1: 18,
          2: 20,
          3: 38,
          4: 44,
          5: 51,
          6: 64
        }
      }
    },
    substat: {
      1: {
        max: {
          1: 300,
          2: 525,
          3: 825,
          4: 1125,
          5: 1500,
          6: 1875
        }
      },
      2: {
        max: {
          1: 10,
          2: 15,
          3: 25,
          4: 30,
          5: 35,
          6: 40
        }
      },
      3: {
        max: {
          1: 20,
          2: 25,
          3: 40,
          4: 50,
          5: 75,
          6: 100
        }
      },
      4: {
        max: {
          1: 10,
          2: 15,
          3: 25,
          4: 30,
          5: 35,
          6: 40
        }
      },
      5: {
        max: {
          1: 20,
          2: 25,
          3: 40,
          4: 50,
          5: 75,
          6: 100
        }
      },
      6: {
        max: {
          1: 10,
          2: 15,
          3: 25,
          4: 30,
          5: 35,
          6: 40
        }
      },
      8: {
        max: {
          1: 5,
          2: 10,
          3: 15,
          4: 20,
          5: 25,
          6: 30
        }
      },
      9: {
        max: {
          1: 5,
          2: 10,
          3: 15,
          4: 20,
          5: 25,
          6: 30
        }
      },
      10: {
        max: {
          1: 10,
          2: 15,
          3: 20,
          4: 25,
          5: 25,
          6: 35
        }
      },
      11: {
        max: {
          1: 10,
          2: 15,
          3: 20,
          4: 25,
          5: 35,
          6: 40
        }
      },
      12: {
        max: {
          1: 10,
          2: 15,
          3: 20,
          4: 25,
          5: 35,
          6: 40
        }
      }
    }
  },
  grindstone: {
    1: {
      range: {
        1: { min: 80, max: 120 },
        2: { min: 100, max: 200 },
        3: { min: 180, max: 250 },
        4: { min: 230, max: 450 },
        5: { min: 430, max: 550 }
      }
    },
    2: {
      range: {
        1: { min: 1, max: 3 },
        2: { min: 2, max: 5 },
        3: { min: 3, max: 6 },
        4: { min: 4, max: 7 },
        5: { min: 5, max: 10 }
      }
    },
    3: {
      range: {
        1: { min: 4, max: 8 },
        2: { min: 6, max: 12 },
        3: { min: 10, max: 18 },
        4: { min: 12, max: 22 },
        5: { min: 18, max: 30 }
      }
    },
    4: {
      range: {
        1: { min: 1, max: 3 },
        2: { min: 2, max: 5 },
        3: { min: 3, max: 6 },
        4: { min: 4, max: 7 },
        5: { min: 5, max: 10 }
      }
    },
    5: {
      range: {
        1: { min: 4, max: 8 },
        2: { min: 6, max: 12 },
        3: { min: 10, max: 18 },
        4: { min: 12, max: 22 },
        5: { min: 18, max: 30 }
      }
    },
    6: {
      range: {
        1: { min: 1, max: 3 },
        2: { min: 2, max: 5 },
        3: { min: 3, max: 6 },
        4: { min: 4, max: 7 },
        5: { min: 5, max: 10 }
      }
    },
    8: {
      range: {
        1: { min: 1, max: 2 },
        2: { min: 1, max: 2 },
        3: { min: 2, max: 3 },
        4: { min: 3, max: 4 },
        5: { min: 4, max: 5 }
      }
    },
    9: {
      range: {
        1: { min: 0, max: 0 },
        2: { min: 0, max: 0 },
        3: { min: 0, max: 0 },
        4: { min: 0, max: 0 },
        5: { min: 0, max: 0 }
      }
    },
    10: {
      range: {
        1: { min: 0, max: 0 },
        2: { min: 0, max: 0 },
        3: { min: 0, max: 0 },
        4: { min: 0, max: 0 },
        5: { min: 0, max: 0 }
      }
    },
    11: {
      range: {
        1: { min: 0, max: 0 },
        2: { min: 0, max: 0 },
        3: { min: 0, max: 0 },
        4: { min: 0, max: 0 },
        5: { min: 0, max: 0 }
      }
    },
    12: {
      range: {
        1: { min: 0, max: 0 },
        2: { min: 0, max: 0 },
        3: { min: 0, max: 0 },
        4: { min: 0, max: 0 },
        5: { min: 0, max: 0 }
      }
    }
  },
  /*
  effectTypeStrings: {
      0: '',
      1: `HP +${value}`,
      2: `HP ${value}%`,
      3: `ATK +${value}`,
      4: `ATK ${value}%`,
      5: `DEF +${value}`,
      6: `DEF ${value}%`,
      8: `SPD +${value}`,
      9: `CRI Rate ${value}%`,
      10: `CRI Dmg ${value}%`,
      11: `Resistance ${value}%`,
      12: `Accuracy ${value}%`
    },*/

  getRuneEfficiency(rune, toFixed = 2) {
    let ratio = 0.0;
	let ratioHeroGrinded = 0.0;
	let ratioLegendGrinded = 0.0;

    // main stat
    ratio +=
      this.rune.mainstat[rune.pri_eff[0]].max[gMapping.isAncient(rune) ? rune.class - 10 : rune.class] / this.rune.mainstat[rune.pri_eff[0]].max[6];
	ratioHeroGrinded +=
		this.rune.mainstat[rune.pri_eff[0]].max[gMapping.isAncient(rune) ? rune.class - 10 : rune.class] / this.rune.mainstat[rune.pri_eff[0]].max[6];
	ratioLegendGrinded +=
		this.rune.mainstat[rune.pri_eff[0]].max[gMapping.isAncient(rune) ? rune.class - 10 : rune.class] / this.rune.mainstat[rune.pri_eff[0]].max[6];
		
    // sub stats
    rune.sec_eff.forEach(stat => {
      let value = stat[3] && stat[3] > 0 ? stat[1] + stat[3] : stat[1];
      ratio += value / this.rune.substat[stat[0]].max[6];
	  
	  grindValue = this.grindstone[stat[0]].range[4].max;
	  value = stat[1] + grindValue;
	  ratioHeroGrinded += value / this.rune.substat[stat[0]].max[6];
	  
	  grindValue = this.grindstone[stat[0]].range[5].max;
	  value = stat[1] + grindValue;
	  ratioLegendGrinded += value / this.rune.substat[stat[0]].max[6];
    });

    // innate stat
    if (rune.prefix_eff && rune.prefix_eff[0] > 0) {
      ratio += rune.prefix_eff[1] / this.rune.substat[rune.prefix_eff[0]].max[6];
	  ratioHeroGrinded += rune.prefix_eff[1] / this.rune.substat[rune.prefix_eff[0]].max[6];
	  ratioLegendGrinded += rune.prefix_eff[1] / this.rune.substat[rune.prefix_eff[0]].max[6];
    }

    let efficiency = (ratio / 2.8) * 100;
	let efficiencyHero = (ratioHeroGrinded / 2.8) * 100;
	let efficiencyLegend = (ratioLegendGrinded / 2.8) * 100;

    return {
      current: ((ratio / 2.8) * 100).toFixed(toFixed),
      max: (efficiency + ((Math.max(Math.ceil((12 - rune.upgrade_curr) / 3.0), 0) * 0.2) / 2.8) * 100).toFixed(toFixed),
	  maxHeroGrinded:(efficiencyHero + ((Math.max(Math.ceil((12 - rune.upgrade_curr) / 3.0), 0) * 0.2) / 2.8) * 100).toFixed(toFixed),
	  maxLegendGrinded:(efficiencyLegend + ((Math.max(Math.ceil((12 - rune.upgrade_curr) / 3.0), 0) * 0.2) / 2.8) * 100).toFixed(toFixed)
    };
  }
};
