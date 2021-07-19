const pluginName = 'RuneDropEfficiency2';

module.exports = {
  defaultConfig: {
    enabled: true,
	showAllUpgrades: false,
	flatStatsHalf: false,
	showGemEfficiencies: false,
	showLegendGemEfficiencies: false
  },
	defaultConfigDetails: {
    showAllUpgrades: {label: 'Show all upgrades?'},
	flatStatsHalf: {label: 'Flat stats count 50%?'},
	showGemEfficiencies: {label: 'Show hero table?'},
	showLegendGemEfficiencies: {label: 'Show legend gem table?'}
	
  },
  pluginName,
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
	try{
    // Extract the rune and display it's efficiency stats.
    switch (command) {
      case 'BattleDungeonResult':
      case 'BattleScenarioResult':
      case 'BattleDimensionHoleDungeonResult':
        if (resp.win_lose === 1) {
          const reward = resp.reward ? resp.reward : {};

          if (reward.crate && reward.crate.rune) {
            runesInfo.push(this.logRuneDrop(reward.crate.rune,config));
          }
        }
        break;
	case 'BattleDimensionHoleDungeonResult_v2':
        if (resp.win_lose === 1) {
          const rewards = resp.changed_item_list ? resp.changed_item_list : [];

          if (rewards) {
            rewards.forEach(reward => {
              if (reward.type === 8) {
                runesInfo.push(this.logRuneDrop(reward.info,config));
              }
            });
          }
        }
        break;
      case 'BattleDungeonResult_V2':
        if (resp.win_lose === 1) {
          const rewards = resp.changed_item_list ? resp.changed_item_list : [];

          if (rewards) {
            rewards.forEach(reward => {
              if (reward.type === 8) {
                runesInfo.push(this.logRuneDrop(reward.info,config));
              }
            });
          }
        }
        break;
      case 'UpgradeRune': {
		  
		 if (config.Config.Plugins[this.pluginName].showAllUpgrades) {
			 runesInfo.push(this.logRuneDrop(resp.rune,config));
		 } else {
			const originalLevel = req.upgrade_curr;
			const newLevel = resp.rune.upgrade_curr;

			if (newLevel > originalLevel && newLevel % 3 === 0 && newLevel <= 12) {
			  runesInfo.push(this.logRuneDrop(resp.rune,config));
			}
		 }
        break;
      }
      case 'AmplifyRune':
      case 'AmplifyRune_v2':
      case 'ConvertRune':
      case 'ConvertRune_v2':
      case 'ConfirmRune':
        runesInfo.push(this.logRuneDrop(resp.rune,config));
        break;

      case 'BuyBlackMarketItem':
        if (resp.runes && resp.runes.length === 1) {
          runesInfo.push(this.logRuneDrop(resp.runes[0],config));
        }
        break;

      case 'BuyGuildBlackMarketItem':
        if (resp.runes && resp.runes.length === 1) {
          runesInfo.push(this.logRuneDrop(resp.runes[0],config));
        }
        break;

      case 'BuyShopItem':
        if (resp.reward && resp.reward.crate && resp.reward.crate.runes) {
          runesInfo.push(this.logRuneDrop(resp.reward.crate.runes[0],config));
        }
        break;

      case 'GetBlackMarketList':
        resp.market_list.forEach(item => {
          if (item.item_master_type === 8 && item.runes) {
            runesInfo.push(this.logRuneDrop(item.runes[0],config));
          }
        });
        break;

      case 'GetGuildBlackMarketList':
        resp.market_list.forEach(item => {
          if (item.item_master_type === 8 && item.runes) {
            runesInfo.push(this.logRuneDrop(item.runes[0],config));
          }
        });
        break;

      case 'BattleWorldBossResult': {
        const reward = resp.reward ? resp.reward : {};

        if (reward.crate && reward.crate.runes) {
          reward.crate.runes.forEach(rune => {
            runesInfo.push(this.logRuneDrop(rune,config));
          });
        }
        break;
      }
      case 'BattleRiftDungeonResult':
        if (resp.item_list) {
          resp.item_list.forEach(item => {
            if (item.type === 8) {
              runesInfo.push(this.logRuneDrop(item.info, config));
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
	}catch(e) {
	proxy.log({ type: 'debug', source: 'plugin', name: this.pluginName, message: `${resp['command']}-${e.message}` });
	}
  },

  logRuneDrop(rune,config,proxy) {
    const efficiency = this.getRuneEfficiency(rune,config,proxy);
    const runeQuality = gMapping.rune.quality[rune.extra];
    const colorTable = {
      Common: 'grey',
      Magic: 'green',
      Rare: 'blue',
      Hero: 'purple',
      Legend: 'orange'
    };

    let color = colorTable[runeQuality];
    let starHtml = this.mountStarsHtml(rune);
	let effectsHtml = this.mountRuneStats(rune);
	let gemHtml = this.mountGemValuesTable(rune,config);
//<img src="../assets/runes/${this.rune.sets[rune.set_id]}.png" />
    return `<div class="rune item" height="105px">
              <div class="ui image ${color} label">
				${effectsHtml}
                <span class="upgrade">+${rune.upgrade_curr}</span>  
              </div>

              <div class="content">
                ${starHtml}
                <div class="header">${gMapping.isAncient(rune) ? 'Ancient ' : ''}${gMapping.rune.sets[rune.set_id]} Rune (${rune.slot_no}) ${
					gMapping.rune.effectTypes[rune.pri_eff[0]]}: ${this.rune.quality[rune.extra]}</div>
                <div class="description">Efficiency: ${efficiency.current}%. Max:${efficiency.max}%. </div>
				<div class="description">Hero Grinded:${efficiency.maxHeroGrinded}%. Legend Grinded:${efficiency.maxLegendGrinded}%.</div>
				${config.Config.Plugins[pluginName].showGemEfficiencies || config.Config.Plugins[pluginName].showLegendGemEfficiencies ? gemHtml : ''}
              </div>
            </div>`;
  },
  mountRuneStats(rune) {
	  
	  let html = '<div class="stat-line">';
	  
	  // innate stat
    if (rune.prefix_eff && rune.prefix_eff[0] > 0) {
		let value = rune.prefix_eff[1];
		html = html.concat(`<div class="stat">${this.geteffectTypeStrings[rune.prefix_eff[0]]}:${value}</div>`);
    }
	  // sub stats
    rune.sec_eff.forEach(stat => {
		let value = stat[3] && stat[3] > 0 ? stat[1] + stat[3] : stat[1];
		html = html.concat(`<div class="stat">${this.geteffectTypeStrings[stat[0]]}:${value}</div>`);
    });
	  return html.concat('</div>');
  },
  topN(arr,n){
	if(n>arr.length){
		return false
	}
	return arr
	.slice()
	.sort((a,b) => {
		return b.eff - a.eff
	})
	.slice(0,n);		
  },
  mountGemValuesTable(rune,config) {
	  html = '';
	  if(config.Config.Plugins[pluginName].showGemEfficiencies){
	  html = html.concat('<div class="description"> Hero Gem + Hero Grinds Table:</div>');
	  html = html.concat(`<div class="gem-table">`);
	  //Table 1: Hero Gem + Grinds
	  html = html.concat(`<table border="1" cellspacing="0" cellpadding="0"><tr><th>Sub</th>`);
	  //add column headers from effect strings
	  for (var sub in this.geteffectTypeStrings) {
			  html = sub>0 ? html.concat(`<th>${this.geteffectTypeStrings[sub]}</th>`) : html;
	  }
	  html=html.concat(`</tr>`);
	  //calculate top 3 efficiencies
	  effArr = []
	  effVal = {}
	  effVal.eff=0;
	  rune.sec_eff.forEach(stat=> {
		  for (var sub in this.geteffectTypeStrings) {
			  if (sub >0) {
				val =this.getSubStatGemEfficiency(rune,stat[0],sub,4,config);
				effVal.eff = val.maxGrinded=='' ? 0 : val.maxGrinded;
				effArr.push(effVal.eff);
			  }
		  }
	  });
	  effArr.sort((a,b)=>b-a);//this.topN(effArr,3);
	  lastItem = effArr.length-1<3 ? effArr.length-1 :3;
	  vals = effArr.slice(0,lastItem);
	  limit = vals[lastItem-1];
	  //add substat info 
	  rune.sec_eff.forEach(stat => {
		html = html.concat(`<tr><td>${this.geteffectTypeStrings[stat[0]]}</td>`);
		//populate gem efficiencies
		for (var sub in this.geteffectTypeStrings) {
			if (sub >0) {
				newEfficiency = this.getSubStatGemEfficiency(rune,stat[0],sub,4,config);
				colorStyle = parseFloat(newEfficiency.maxGrinded)>=limit ? 'bgcolor="lightgreen"' : '';
				html = html.concat(`<td ${colorStyle}>${newEfficiency.maxGrinded}</td>`);
			}
		}
		html=html.concat(`</tr>`);
		
    });
		html = html.concat('</table></div><br>');
	  }
	  if(config.Config.Plugins[pluginName].showLegendGemEfficiencies){
	  //Table 2: Legend Gem + Grinds
	  html = html.concat('<div class="description"> Legend Gem + Legend Grinds Table:</div>');
	  html = html.concat(`<div class="gem-table">`);
	  html = html.concat(`<table border="1" cellspacing="0" cellpadding="0"><tr><th>Sub</th>`);
	  //add column headers from effect strings
	  for (var sub in this.geteffectTypeStrings) {
			  html = sub>0 ? html.concat(`<th>${this.geteffectTypeStrings[sub]}</th>`) : html;
	  }
	  html=html.concat(`</tr>`);
	  //calculate top 3 efficiencies
	  effArr = []
	  effVal = {}
	  effVal.eff=0;
	  rune.sec_eff.forEach(stat=> {
		  for (var sub in this.geteffectTypeStrings) {
			  if (sub >0) {
				val =this.getSubStatGemEfficiency(rune,stat[0],sub,5,config);
				effVal.eff = val.maxGrinded=='' ? 0 : val.maxGrinded;
				effArr.push(effVal.eff);
			  }
		  }
	  });
	  effArr.sort((a,b)=>b-a);//this.topN(effArr,3);
	  lastItem = effArr.length-1<3 ? effArr.length-1 :3;
	  vals = effArr.slice(0,lastItem);
	  limit2 = vals[lastItem-1];
	  //add substat info 
	  rune.sec_eff.forEach(stat => {
		html = html.concat(`<tr><td>${this.geteffectTypeStrings[stat[0]]}</td>`);
		//populate gem efficiencies
		for (var sub in this.geteffectTypeStrings) {
			if (sub >0) {
				newEfficiency = this.getSubStatGemEfficiency(rune,stat[0],sub,5,config);
				colorStyle = parseFloat(newEfficiency.maxGrinded)>=limit2 ? 'bgcolor="lightgreen"' : '';
				html = html.concat(`<td ${colorStyle}>${newEfficiency.maxGrinded}</td>`);
			}
		}
		html=html.concat(`</tr>`);
		
    });
		html = html.concat('</table></div>');
	  }
	  return html;
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
        },
		max50: {
          1: 300*2,
          2: 525*2,
          3: 825*2,
          4: 1125*2,
          5: 1500*2,
          6: 1875*2
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
        },
		max50: {
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
        },
		max50: {
          1: 20*2,
          2: 25*2,
          3: 40*2,
          4: 50*2,
          5: 75*2,
          6: 100*2
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
        },
		max50: {
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
        },
		max50: {
          1: 20*2,
          2: 25*2,
          3: 40*2,
          4: 50*2,
          5: 75*2,
          6: 100*2
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
        },
		max50: {
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
        },
		max50: {
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
        },
		max50: {
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
        },
		max50: {
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
        },
		max50: {
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
        },
		max50: {
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
  gem: {
    1: {
      range: {
        1: { min: 0, max: 0 },
        2: { min: 0, max: 0 },
        3: { min: 0, max: 0 },
        4: { min: 290, max: 420 },
        5: { min: 400, max: 580 }
      }
    },
    2: {
      range: {
        1: { min: 0, max: 0 },
        2: { min: 0, max: 0 },
        3: { min: 0, max: 0 },
        4: { min: 7, max: 11 },
        5: { min: 9, max: 13 }
      }
    },
    3: {
      range: {
        1: { min: 0, max: 0 },
        2: { min: 0, max: 0 },
        3: { min: 0, max: 0 },
        4: { min: 20, max: 30 },
        5: { min: 28, max: 40 }
      }
    },
    4: {
      range: {
        1: { min: 0, max: 0 },
        2: { min: 0, max: 0 },
        3: { min: 0, max: 0 },
        4: { min: 7, max: 11 },
        5: { min: 9, max: 13 }
      }
    },
    5: {
      range: {
        1: { min: 0, max: 0 },
        2: { min: 0, max: 0 },
        3: { min: 0, max: 0 },
        4: { min: 20, max: 30 },
        5: { min: 28, max: 40 }
      }
    },
    6: {
      range: {
        1: { min: 0, max: 0 },
        2: { min: 0, max: 0 },
        3: { min: 0, max: 0 },
        4: { min: 7, max: 11 },
        5: { min: 9, max: 13 }
      }
    },
    8: {
      range: {
        1: { min: 0, max: 0 },
        2: { min: 0, max: 0 },
        3: { min: 0, max: 0 },
        4: { min: 5, max: 8 },
        5: { min: 7, max: 10 }
      }
    },
    9: {
      range: {
        1: { min: 0, max: 0 },
        2: { min: 0, max: 0 },
        3: { min: 0, max: 0 },
        4: { min: 4, max: 7 },
        5: { min: 6, max: 9 }
      }
    },
    10: {
      range: {
        1: { min: 0, max: 0 },
        2: { min: 0, max: 0 },
        3: { min: 0, max: 0 },
        4: { min: 5, max: 8 },
        5: { min: 7, max: 10 }
      }
    },
    11: {
      range: {
        1: { min: 0, max: 0 },
        2: { min: 0, max: 0 },
        3: { min: 0, max: 0 },
        4: { min: 6, max: 9 },
        5: { min: 8, max: 11 }
      }
    },
    12: {
      range: {
        1: { min: 0, max: 0 },
        2: { min: 0, max: 0 },
        3: { min: 0, max: 0 },
        4: { min: 6, max: 9 },
        5: { min: 8, max: 11 }
      }
    }
	
  },
  
  geteffectTypeStrings: {
      0: '',
      1: `HP+`,
      2: `HP%`,
      3: `ATK+`,
      4: `ATK%`,
      5: `DEF+`,
      6: `DEF%`,
      8: `SPD+`,
      9: `CRR%`,
      10: `CDmg%`,
      11: `RES%`,
      12: `ACC%`
    },

  getRuneEfficiency(rune,config, toFixed = 2) {
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
	  let maxValue = (config.Config.Plugins[pluginName].flatStatsHalf ? this.rune.substat[stat[0]].max50[6] : this.rune.substat[stat[0]].max[6]);
      ratio += value / maxValue;
	  
	  grindValue = this.grindstone[stat[0]].range[4].max;
	  value = value > stat[1] + grindValue ? value : stat[1] + grindValue;
	  ratioHeroGrinded += value / maxValue;
	  
	  grindValue = this.grindstone[stat[0]].range[5].max;
	  value = stat[1] + grindValue;
	  ratioLegendGrinded += value / maxValue;
    });

    // innate stat
    if (rune.prefix_eff && rune.prefix_eff[0] > 0) {
		let maxValue = (config.Config.Plugins[pluginName].flatStatsHalf ? this.rune.substat[rune.prefix_eff[0]].max50[6] : this.rune.substat[rune.prefix_eff[0]].max[6]);
		ratio += rune.prefix_eff[1] / maxValue;
		ratioHeroGrinded += rune.prefix_eff[1] / maxValue;
		ratioLegendGrinded += rune.prefix_eff[1] / maxValue;
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

  },
  getSubStatGemEfficiency(rune,statOrig, statReplace,grindLevel,config, toFixed = 2) {
	let ratioGrinded = 0.0;
	exclude = 0;
    // main stat
	if(rune.pri_eff[0]==statReplace){
		exclude = 1;
	}
	ratioGrinded +=
		this.rune.mainstat[rune.pri_eff[0]].max[gMapping.isAncient(rune) ? rune.class - 10 : rune.class] / this.rune.mainstat[rune.pri_eff[0]].max[6];
		
    // sub stats
    rune.sec_eff.forEach(stat => {
		if (stat[2]==1 && statOrig != stat[0]){
			exclude = 1;
		};
		if (statOrig == stat[0]){
			//Rules to stop Slot 1 cannot have DEF, Slot 3 cannot have Atk, if rune already gemmed must use that, cannot use any other stats including primary and innate
			if (rune.slot_no == 3 && (statReplace == 3 || statReplace == 4)) {
				exclude = 1; 
			}
			if (rune.slot_no == 1 && (statReplace == 5 || statReplace == 6)) {
				exclude = 1; 
			}
			rune.sec_eff.forEach(stat2 => {
				if (stat2[0]!=stat[0]){
					if(stat2[0]==statReplace){
						exclude=1;
					}
				}
			});
			
			value = this.gem[statReplace].range[grindLevel].max;
			grindValue = this.grindstone[statReplace].range[grindLevel].max;
			value = value + grindValue;
			maxValue = (config.Config.Plugins[pluginName].flatStatsHalf ? this.rune.substat[statReplace].max50[6] : this.rune.substat[statReplace].max[6]);
		} else {
			value = stat[3] && stat[3] > 0 ? stat[1] + stat[3] : stat[1];
			grindValue = this.grindstone[stat[0]].range[grindLevel].max;
			value = value > stat[1] + grindValue ? value : stat[1] + grindValue;
			maxValue = (config.Config.Plugins[pluginName].flatStatsHalf ? this.rune.substat[stat[0]].max50[6] : this.rune.substat[stat[0]].max[6]);
		}
	  ratioGrinded += value / maxValue;
    });

    // innate stat
	
    if (rune.prefix_eff && rune.prefix_eff[0] > 0) {
		if (rune.prefix_eff[0]==statReplace){
			exclude = 1;
		}
		
		let maxValue = (config.Config.Plugins[pluginName].flatStatsHalf ? this.rune.substat[rune.prefix_eff[0]].max50[6] : this.rune.substat[rune.prefix_eff[0]].max[6]);
		ratioGrinded += rune.prefix_eff[1] / maxValue;
    }


	let efficiencyGrinded = (ratioGrinded / 2.8) * 100;
	efficiencyGrinded= exclude == 1 ? efficiencyGrinded = 0 : efficiencyGrinded;
	if(efficiencyGrinded==0){
		return {
	  //current: ((ratioGrinded / 2.8) * 100).toFixed(toFixed),
	  maxGrinded:''
    };
	} else {
    return {
	  //current: ((ratioGrinded / 2.8) * 100).toFixed(toFixed),
	  maxGrinded:(efficiencyGrinded + ((Math.max(Math.ceil((12 - rune.upgrade_curr) / 3.0), 0) * 0.2) / 2.8) * 100).toFixed(toFixed)
    };
	}
  }
};
