const dialog = require('dialog-node');

const Campaign = require('../db/models/tb_campaigns');
const Instance = require('../db/models/tb_instances');

const mercantil = require('./automation/Mercantil');

var createCallback = function(data) {
    return async function(code, retVal, stderr) {
        if (!isNaN(Number(retVal))) {

          const instanceNumber = Number(retVal);

            const selectInstance = await Instance.findAll({
              where: {
                instance: instanceNumber,
                status: 'LIVRE',
              }
            })

            if (selectInstance.length) {

              await Instance.update(
                { status: 'EM USO' },
                {
                  where: {
                    instance: instanceNumber
                  }
                }
              );

              const { name, company, records, file_data } = data;

              const insertCampaign = await Campaign.create({ name, company, records, file_data });

              // Automação aqui
              await mercantil({ 
                user: selectInstance[0].user, 
                password: selectInstance[0].password, 
                data: JSON.parse(file_data)
              });

              await Instance.update(
                { status: 'LIVRE' },
                {
                  where: {
                    instance: instanceNumber
                  }
                }
              );

              await Campaign.update(
                { status: 'CONCLUÍDA' },
                {
                  where: {
                    id: insertCampaign.id
                  }
                }
              );

            } else {
              dialog.error('Essa instância não existe ou está em uso!', "<Instância Incorreta>", 0);  
            }
            
        } else {
            dialog.error('O valor precisa ser um número!', "<Valor Incorreto>", 0);  
        }
    };
};

exports.createCampaign = async (req, res) => {
  try {
    const data = req.body;

    dialog.entry('Digite a instância:', "Inciar Campanha", 0, createCallback(data));

    res.send();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};