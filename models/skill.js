'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Skill extends Model {
        static associate(models) {
            Skill.belongsToMany(models.User, { through: models.UserSkill, foreignKey: 'skillId' });
        }
    }
    Skill.init({
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        }
    }, {
        sequelize,
        modelName: 'Skill',
        tableName: 'skills',
    });
    return Skill;
};