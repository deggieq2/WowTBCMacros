TBCMacroBuilderTemplates = {
  {
    name = 'Startattack + Cast',
    body = '#showtooltip\n/startattack\n/cast '
  },
  {
    name = 'Petattack + Cast',
    body = '#showtooltip\n/petattack [target=mouseover,harm,exists]\n/cast [harm] '
  },
  {
    name = 'Stopcasting + Cast',
    body = '#showtooltip\n/stopcasting\n/cast '
  }
}

TBCMacroBuilderDruidTemplates = {
  {
    name = 'Powershift Cat',
    body = '#showtooltip Cat Form\n/cancelform\n/cast Cat Form'
  },
  {
    name = 'Powershift Bear',
    body = '#showtooltip Bear Form\n/cancelform\n/cast Bear Form'
  },
  {
    name = 'Powershift Travel',
    body = '#showtooltip Travel Form\n/cancelform\n/cast Travel Form'
  }
}

TBCMacroBuilderDruidDMHTemplates = {
  {
    name = 'DMH Cat Shift',
    body = '#showtooltip Cat Form\n/dmh start\n/cast !Cat Form\n/dmh end'
  },
  {
    name = 'DMH Bear Shift',
    body = '#showtooltip Dire Bear Form\n/dmh start\n/cast !Dire Bear Form\n/dmh end'
  },
  {
    name = 'DMH Heal Pot',
    body = '#showtooltip Super Healing Potion\n/dmh start\n/dmh cd pot\n/use Super Healing Potion\n/cast !Dire Bear Form\n/dmh end'
  },
  {
    name = 'DMH Mana Pot',
    body = '#showtooltip Super Mana Potion\n/dmh stun gcd cd pot\n/use Super Mana Potion\n/cast !Cat Form\n/dmh end'
  },
  {
    name = 'DMH Innervate',
    body = '#showtooltip Innervate\n/dmh innervate focus target player\n/cast [@focus,help,nodead] Innervate; Innervate\n/dmh end'
  }
}
