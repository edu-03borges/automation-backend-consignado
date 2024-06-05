const { DataTypes } = require('sequelize');
const sequelize = require('../connection');

const TbCampaign = sequelize.define('tb_campaigns', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    uuid: {
        type: DataTypes.STRING,
        allowNull: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: true
    },
    company: {
        type: DataTypes.STRING,
        allowNull: true
    },
    records: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    status: {
        type: DataTypes.STRING,
        allowNull: true
    },
    file_data: {
        type: DataTypes.STRING,
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW
    },
    updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'tb_campaigns',
    timestamps: false 
});

module.exports = TbCampaign;
